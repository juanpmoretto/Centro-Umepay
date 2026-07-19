import { describe, expect, it } from 'vitest';
import { calculateQuote } from './calculateQuote';
import type { PricingConfig } from './types';

const SEASON_ID = 'season-1';
const SINGLE_ID = 'acc-single'; // capacity 1, stands in for "cabaña individual"
const QUAD_ID = 'acc-quad'; // capacity 4, stands in for "cabaña cuádruple"
const MEAL_FULL_PREMIUM_ID = 'meal-full-premium';

// Real values confirmed by reading the actual cell formulas (not just
// displayed values) in the Centro Umepay master "cotizador" spreadsheet tab.
const SALON_PER_DAY = 58557.23;
const LOGISTICS_FLAT = 50017.95;
const SINGLE_RATE = 242081.12; // "cabaña con baño interior · individual"
const QUAD_RATE = 438711.07; // "cabaña con baño interior · cuádruple" -- NOT 4x the individual rate

function buildConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    seasons: [{ id: SEASON_ID, name: 'Temporada actual', start_date: '2020-01-01', end_date: '2035-12-31', salon_per_day: SALON_PER_DAY, sort_order: 1, synced_at: '' }],
    accommodationTypes: [
      { id: SINGLE_ID, code: 'cabint_individual', label: 'Cabaña con baño interior · individual', min_capacity: 1, max_capacity: 1, total_units: 5, bathroom_type: 'interior', sort_order: 1 },
      { id: QUAD_ID, code: 'cabint_cuadruple', label: 'Cabaña con baño interior · cuádruple', min_capacity: 4, max_capacity: 4, total_units: 5, bathroom_type: 'interior', sort_order: 2 },
    ],
    accommodationRates: [
      { id: 'rate-1', season_id: SEASON_ID, accommodation_type_id: SINGLE_ID, combined_rate_per_night: SINGLE_RATE, synced_at: '' },
      { id: 'rate-2', season_id: SEASON_ID, accommodation_type_id: QUAD_ID, combined_rate_per_night: QUAD_RATE, synced_at: '' },
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
    settings: {
      id: true,
      iva_pct: 21,
      deposit_pct: 30,
      extra_meal_price: 24485.2,
      logistics_flat: LOGISTICS_FLAT,
      synced_at: '',
    },
    ...overrides,
  };
}

describe('calculateQuote', () => {
  it('reproduces the master spreadsheet\'s own baseline: 0 accommodation, 3 nights -> $224,448 total', () => {
    // This exact scenario (zero units selected, 3 nights) is the live cached
    // state of the real "cotizador " tab at the time it was read: B18/C18/C22
    // evaluate to 203,120.6625 / 203,120.6625 / 224,448.3321 respectively.
    // It isolates the fixed salon+logistics costs from any accommodation line.
    const config = buildConfig();
    const result = calculateQuote(
      { retreatStartDate: '2026-01-01', nights: 3, accommodationMix: [], mealTierId: null },
      config,
    );

    expect(result.grossBeforeDiscount).toBe(225690); // (58557.23*3 + 50017.95), rounded per line
    expect(result.subtotalAfterDiscounts).toBe(203121); // *0.9 nights multiplier, 0% headcount
    expect(result.total).toBeCloseTo(224448.33, -1); // within a peso of the real cached value
  });

  it('prices a single accommodation unit including its own fixed salon+logistics costs', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: SINGLE_ID, units: 1 }],
        mealTierId: null,
      },
      config,
    );

    expect(result.baseAccommodationTotal).toBe(242081);
    expect(result.salonCostTotal).toBe(58557);
    expect(result.logisticsCostTotal).toBe(50018);
    expect(result.grossBeforeDiscount).toBe(350656);
    expect(result.total).toBeCloseTo(387475, -1);
  });

  it('prices a multi-person configuration as one non-linear unit rate, not per-person linear', () => {
    const config = buildConfig();
    const oneQuad = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: QUAD_ID, units: 1 }],
        mealTierId: null,
      },
      config,
    );
    const fourSingles = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: SINGLE_ID, units: 4 }],
        mealTierId: null,
      },
      config,
    );

    expect(oneQuad.totalPeople).toBe(4);
    expect(oneQuad.baseAccommodationTotal).toBe(Math.round(QUAD_RATE));
    // Same headcount (4), but a single "cuádruple" unit costs less than 4
    // separate "individual" units -- confirms the rate isn't per-person linear.
    expect(oneQuad.baseAccommodationTotal).toBeLessThan(fourSingles.baseAccommodationTotal);
  });

  it('combines nights and headcount discounts multiplicatively, not additively', () => {
    const config = buildConfig();
    // 7 quad units = 28 people (>26, 6% headcount discount), 11 nights (30% nights discount)
    const result = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 11,
        accommodationMix: [{ accommodationTypeId: QUAD_ID, units: 7 }],
        mealTierId: null,
      },
      config,
    );

    const nightsMultiplier = 0.7;
    const headcountMultiplier = 0.94;
    const expectedMultiplicative = Math.round(result.grossBeforeDiscount * nightsMultiplier * headcountMultiplier);
    const naiveAdditive = Math.round(result.grossBeforeDiscount * (1 - 0.3 - 0.06));

    expect(result.subtotalAfterDiscounts).toBe(expectedMultiplicative);
    expect(result.subtotalAfterDiscounts).not.toBe(naiveAdditive);
  });

  it('assigns Nave for large groups and Nodriza for small groups within its range', () => {
    const config = buildConfig();
    const nave = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: QUAD_ID, units: 5 }], // 20 people
        mealTierId: null,
      },
      config,
    );
    expect(nave.salon.salonCode).toBe('nave');
    expect(nave.salonAdjustmentAmount).toBe(0);

    const nodriza = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: SINGLE_ID, units: 10 }],
        mealTierId: null,
      },
      config,
    );
    expect(nodriza.salon.salonCode).toBe('nodriza');
    expect(nodriza.salonAdjustmentAmount).toBe(-250000);
    expect(nodriza.total).toBe(nodriza.cashTotalWithAddons + nodriza.ivaAmount - 250000);
  });

  it('flags an out-of-range group (between Nodriza max and Nave min) with a warning, but still computes a price', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: SINGLE_ID, units: 15 }],
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
        nights: 2,
        accommodationMix: [{ accommodationTypeId: QUAD_ID, units: 6 }], // 24 people
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
        accommodationMix: [{ accommodationTypeId: QUAD_ID, units: 5 }], // 20 people
        mealTierId: null,
        longWeekendDates,
      },
      config,
    );
    expect(qualifies.salon.salonCode).toBe('nave');
  });

  it('adds the meal surcharge and extra meals after discounts, not subject to them', () => {
    const config = buildConfig();
    const withMeat = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: SINGLE_ID, units: 4 }],
        mealTierId: MEAL_FULL_PREMIUM_ID,
        extraMealsCount: 2,
      },
      config,
    );

    expect(withMeat.mealSurchargeTotal).toBe(4 * 32000);
    expect(withMeat.extraMealsTotal).toBe(Math.round(2 * 24485.2));
    expect(withMeat.cashTotalWithAddons).toBe(
      withMeat.subtotalAfterDiscounts + withMeat.mealSurchargeTotal + withMeat.extraMealsTotal,
    );
  });

  it('applies a staff manual adjustment with its note to the final total', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-01-01',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: SINGLE_ID, units: 4 }],
        mealTierId: null,
        manualAdjustment: { amount: -50000, note: 'Alojamiento gratis para el facilitador' },
      },
      config,
    );

    expect(result.manualAdjustmentAmount).toBe(-50000);
    expect(result.manualAdjustmentNote).toBe('Alojamiento gratis para el facilitador');
    expect(result.total).toBe(result.cashTotalWithAddons + result.ivaAmount - 50000);
  });

  it('throws a clear error when the retreat date falls outside every configured season', () => {
    const config = buildConfig({
      seasons: [{ id: SEASON_ID, name: 'Temporada acotada', start_date: '2026-01-01', end_date: '2026-01-31', salon_per_day: SALON_PER_DAY, sort_order: 1, synced_at: '' }],
    });
    expect(() =>
      calculateQuote(
        {
          retreatStartDate: '2027-01-01',
          nights: 1,
          accommodationMix: [{ accommodationTypeId: SINGLE_ID, units: 2 }],
          mealTierId: null,
        },
        config,
      ),
    ).toThrow(/temporada/i);
  });
});
