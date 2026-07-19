import { describe, expect, it } from 'vitest';
import { calculateQuote } from './calculateQuote';
import type { PricingConfig } from './types';

const SEASON_ID = 'season-1';
const CABANA_ID = 'acc-cabana';
const CARPA_ID = 'acc-carpa';
const MEAL_FULL_PREMIUM_ID = 'meal-full-premium';

function buildConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    seasons: [{ id: SEASON_ID, name: 'Octubre', start_date: '2026-10-01', end_date: '2026-10-31', sort_order: 1, synced_at: '' }],
    accommodationTypes: [
      { id: CABANA_ID, code: 'cabana_int', label: 'Cabaña con baño interior', min_capacity: 1, max_capacity: 4, total_units: 5, bathroom_type: 'interior', sort_order: 1 },
      { id: CARPA_ID, code: 'carpa', label: 'Carpa', min_capacity: 1, max_capacity: 2, total_units: 10, bathroom_type: 'exterior', sort_order: 2 },
    ],
    accommodationRates: [
      { id: 'rate-1', season_id: SEASON_ID, accommodation_type_id: CABANA_ID, price_per_person_per_night: 203121, synced_at: '' },
      { id: 'rate-2', season_id: SEASON_ID, accommodation_type_id: CARPA_ID, price_per_person_per_night: 25000, synced_at: '' },
    ],
    mealTiers: [
      { id: MEAL_FULL_PREMIUM_ID, code: 'full', label: 'Todas las comidas (premium)', protein_tier: 'premium_400g', surcharge_per_person_total: 32000, sort_order: 1 },
    ],
    nightsDiscounts: [
      { id: 'n1', min_nights: 1, max_nights: 2, discount_pct: 0 },
      { id: 'n2', min_nights: 3, max_nights: 4, discount_pct: 10 },
      { id: 'n3', min_nights: 5, max_nights: 10, discount_pct: 20 },
      { id: 'n4', min_nights: 11, max_nights: null, discount_pct: 30 },
    ],
    headcountDiscounts: [
      { id: 'h1', min_people: 16, discount_pct: 3 },
      { id: 'h2', min_people: 26, discount_pct: 6 },
      { id: 'h3', min_people: 41, discount_pct: 10 },
    ],
    salonThresholds: [
      { id: 's1', salon_code: 'nave', label: 'Nave', min_people: 16, max_people: null, long_weekend_min_nights: 3, long_weekend_min_people: 20, flat_adjustment: 0 },
      { id: 's2', salon_code: 'nodriza', label: 'Nodriza', min_people: 8, max_people: 14, long_weekend_min_nights: null, long_weekend_min_people: null, flat_adjustment: -250000 },
    ],
    settings: { id: true, iva_pct: 21, deposit_pct: 30, extra_meal_price: 24485, synced_at: '' },
    ...overrides,
  };
}

describe('calculateQuote', () => {
  it('reproduces the real quote example: 1 person/1 night at $203,121 -> ~$224,448 with IVA', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-10-15',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CABANA_ID, peopleAssigned: 1 }],
        mealTierId: null,
      },
      config,
    );

    expect(result.subtotalBeforeDiscounts).toBe(203121);
    expect(result.totalDiscountPct).toBe(0);
    expect(result.ivaAmount).toBe(21328); // round(203121 * 0.5 * 0.21)
    expect(result.total).toBe(224449); // matches the real ~$224,448 example within rounding
  });

  it('applies nights + headcount discounts additively and assigns Nave for large groups', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 5, // 20% nights discount
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 20 }], // >16 -> 3% headcount discount
        mealTierId: null,
      },
      config,
    );

    expect(result.nightsDiscountPct).toBe(20);
    expect(result.headcountDiscountPct).toBe(3);
    expect(result.totalDiscountPct).toBe(23);
    expect(result.salon.salonCode).toBe('nave');
  });

  it('assigns Nodriza for small groups within its capacity range', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 10 }],
        mealTierId: null,
      },
      config,
    );

    expect(result.salon.salonCode).toBe('nodriza');
    expect(result.salon.warning).toBeNull();
  });

  it('flags an out-of-range group (between Nodriza max and Nave min) with a warning, but still computes a price', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 15 }],
        mealTierId: null,
      },
      config,
    );

    expect(result.salon.salonCode).toBeNull();
    expect(result.salon.warning).not.toBeNull();
    expect(result.total).toBeGreaterThan(0);
  });

  it('requires 3+ nights and 20+ people for Nave during a long weekend', () => {
    const config = buildConfig();
    const longWeekendDates = ['2026-10-09'];

    const tooShort = calculateQuote(
      {
        retreatStartDate: '2026-10-09',
        nights: 2, // fails the long-weekend min-nights rule
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 25 }],
        mealTierId: null,
        longWeekendDates,
      },
      config,
    );
    expect(tooShort.salon.salonCode).not.toBe('nave');

    const qualifies = calculateQuote(
      {
        retreatStartDate: '2026-10-09',
        nights: 3,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 20 }],
        mealTierId: null,
        longWeekendDates,
      },
      config,
    );
    expect(qualifies.salon.salonCode).toBe('nave');
  });

  it('adds the meal surcharge per person on top of the base accommodation cost', () => {
    const config = buildConfig();
    const withMeat = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 4 }],
        mealTierId: MEAL_FULL_PREMIUM_ID,
      },
      config,
    );
    const vegetarian = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 4 }],
        mealTierId: null,
      },
      config,
    );

    expect(withMeat.mealSurchargeTotal).toBe(4 * 32000);
    expect(withMeat.total).toBeGreaterThan(vegetarian.total);
  });

  it('applies the Nodriza flat discount to the final total, and no adjustment for Nave', () => {
    const config = buildConfig();
    const nodriza = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 10 }],
        mealTierId: null,
      },
      config,
    );
    expect(nodriza.salon.salonCode).toBe('nodriza');
    expect(nodriza.salonAdjustmentAmount).toBe(-250000);
    expect(nodriza.total).toBe(nodriza.subtotalAfterDiscounts + nodriza.ivaAmount - 250000);

    const nave = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 20 }],
        mealTierId: null,
      },
      config,
    );
    expect(nave.salon.salonCode).toBe('nave');
    expect(nave.salonAdjustmentAmount).toBe(0);
  });

  it('adds extra standalone meals to the subtotal before discounts', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 4 }],
        mealTierId: null,
        extraMealsCount: 3,
      },
      config,
    );

    expect(result.extraMealsTotal).toBe(3 * 24485);
    expect(result.subtotalBeforeDiscounts).toBe(result.baseAccommodationTotal + result.extraMealsTotal);
  });

  it('applies a staff manual adjustment with its note to the final total', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-10-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 4 }],
        mealTierId: null,
        manualAdjustment: { amount: -50000, note: 'Alojamiento gratis para el facilitador' },
      },
      config,
    );

    expect(result.manualAdjustmentAmount).toBe(-50000);
    expect(result.manualAdjustmentNote).toBe('Alojamiento gratis para el facilitador');
    expect(result.total).toBe(result.subtotalAfterDiscounts + result.ivaAmount - 50000);
  });

  it('throws a clear error when the retreat date falls outside every configured season', () => {
    const config = buildConfig();
    expect(() =>
      calculateQuote(
        {
          retreatStartDate: '2027-01-01',
          nights: 1,
          accommodationMix: [{ accommodationTypeId: CARPA_ID, peopleAssigned: 2 }],
          mealTierId: null,
        },
        config,
      ),
    ).toThrow(/temporada/i);
  });
});
