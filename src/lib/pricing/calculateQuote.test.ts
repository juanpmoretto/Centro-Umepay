import { describe, expect, it } from 'vitest';
import { calculateQuote } from './calculateQuote';
import type { PricingConfig } from './types';

const SEASON_ID = 'season-jul-ago-26';
const TRAILER_ID = 'acc-trailer-x1'; // capacity 1
const CABINT_INDIVIDUAL_ID = 'acc-cabint-individual'; // capacity 1
const CABINT_QUAD_ID = 'acc-cabint-quad'; // capacity 4

// Real Julio-Agosto 2026 values, taken directly from the authoritative
// specification (extracted from the real spreadsheet's formulas, confirmed
// point-by-point with Rochi).
const SALON_PER_DAY = 181500;
const FOOD_PP = 64026.9;
const MEAT_BASE = 22000;
const TRAILER_LODGING = 58428.09;
const CABINT_INDIVIDUAL_LODGING = 162299.03;
const CABINT_QUAD_LODGING = 241283.23;

function buildConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    seasons: [
      {
        id: SEASON_ID,
        name: 'Julio-Agosto 2026',
        start_date: '2026-07-01',
        end_date: '2026-08-31',
        salon_per_day: SALON_PER_DAY,
        food_price_per_person_per_night: FOOD_PP,
        meat_base_price: MEAT_BASE,
        sort_order: 1,
        synced_at: '',
      },
    ],
    accommodationTypes: [
      { id: TRAILER_ID, code: 'trailer_x1', label: 'Trailer individual', min_capacity: 1, max_capacity: 1, total_units: 8, bathroom_type: 'exterior', category: 'trailer', sort_order: 1 },
      { id: CABINT_INDIVIDUAL_ID, code: 'cabint_individual', label: 'Cabaña con baño interior · individual', min_capacity: 1, max_capacity: 1, total_units: 5, bathroom_type: 'interior', category: 'cabin_interior', sort_order: 2 },
      { id: CABINT_QUAD_ID, code: 'cabint_cuadruple', label: 'Cabaña con baño interior · cuádruple', min_capacity: 4, max_capacity: 4, total_units: 5, bathroom_type: 'interior', category: 'cabin_interior', sort_order: 3 },
    ],
    accommodationRates: [
      { id: 'rate-1', season_id: SEASON_ID, accommodation_type_id: TRAILER_ID, lodging_rate_per_night: TRAILER_LODGING, synced_at: '' },
      { id: 'rate-2', season_id: SEASON_ID, accommodation_type_id: CABINT_INDIVIDUAL_ID, lodging_rate_per_night: CABINT_INDIVIDUAL_LODGING, synced_at: '' },
      { id: 'rate-3', season_id: SEASON_ID, accommodation_type_id: CABINT_QUAD_ID, lodging_rate_per_night: CABINT_QUAD_LODGING, synced_at: '' },
    ],
    // Julio-Agosto 2026 has a one-off 10% promo at the 5-9 night tier (other
    // seasons use 5% there) -- confirmed intentional by Rochi, not a typo.
    nightsDiscounts: [
      { id: 'n1', season_id: SEASON_ID, min_nights: 1, max_nights: 2, discount_pct: 0 },
      { id: 'n2', season_id: SEASON_ID, min_nights: 3, max_nights: 4, discount_pct: 3 },
      { id: 'n3', season_id: SEASON_ID, min_nights: 5, max_nights: 9, discount_pct: 10 },
      { id: 'n4', season_id: SEASON_ID, min_nights: 10, max_nights: null, discount_pct: 10 },
    ],
    headcountDiscounts: [
      { id: 'h1', min_people: 16, discount_pct: 3 },
      { id: 'h2', min_people: 26, discount_pct: 6 },
      { id: 'h3', min_people: 41, discount_pct: 10 },
    ],
    liberadosTiers: [
      { id: 'l1', min_people: 16, max_people: 23, multiplier: 1 },
      { id: 'l2', min_people: 24, max_people: 31, multiplier: 2 },
      { id: 'l3', min_people: 32, max_people: null, multiplier: 3 },
    ],
    salonThresholds: [
      { id: 's1', salon_code: 'nave', label: 'Nave', min_people: 16, max_people: null, long_weekend_min_nights: 3, long_weekend_min_people: 20, flat_adjustment: 0 },
      { id: 's2', salon_code: 'nodriza', label: 'Nodriza', min_people: 8, max_people: 14, long_weekend_min_nights: null, long_weekend_min_people: null, flat_adjustment: -250000 },
    ],
    settings: {
      id: true,
      iva_pct: 21,
      deposit_pct: 30,
      cash_discount_pct: 20,
      synced_at: '',
    },
    ...overrides,
  };
}

describe('calculateQuote', () => {
  it('prices lodging and food separately, each with independent IVA applied', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 1 }],
        mealPlan: null,
      },
      config,
    );

    const expectedLodging = Math.round(1 * TRAILER_LODGING * 2 * 1.21);
    const expectedFood = Math.round(1 * FOOD_PP * 1 * 2 * 1.21);

    expect(result.accommodationLines[0].lodgingLineTotal).toBe(expectedLodging);
    expect(result.accommodationLines[0].foodLineTotal).toBe(expectedFood);
    expect(result.accommodationTotal).toBe(expectedLodging);
    expect(result.foodTotal).toBe(expectedFood);
  });

  it('reproduces the reference "costo trailer liberados" value from the spec: one night of trailer x1 lodging with IVA = $70,698', () => {
    // Confirms lodgingOneNight (the discount/liberados basis) matches the
    // spec's own published reference table exactly.
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 5,
        accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 1 }],
        mealPlan: null,
      },
      config,
    );
    expect(result.accommodationLines[0].lodgingOneNight).toBe(70698);
  });

  it('computes nights and headcount discounts on ONE NIGHT of lodging-only cost, so the discount amount does not scale with nights', () => {
    const config = buildConfig();
    const twoNights = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }], // 4 people, no discount tier
        mealPlan: null,
      },
      config,
    );
    const fiveNights = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 5, // crosses into the 3-4/5-9 discount tiers
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }],
        mealPlan: null,
      },
      config,
    );

    expect(twoNights.nightsDiscountPct).toBe(0);
    expect(fiveNights.nightsDiscountPct).toBe(10); // JUL-AGO26's one-off promo tier
    // The discount AMOUNT is fixed (one night's lodging * 10%), regardless of
    // how many nights the stay actually is -- confirmed real (if unintuitive) rule.
    expect(fiveNights.nightsDiscountAmount).toBe(Math.round(fiveNights.lodgingOneNightTotal * 0.1));
    expect(fiveNights.lodgingOneNightTotal).toBe(twoNights.lodgingOneNightTotal);
  });

  it('uses a season-specific nights discount schedule (Julio-Agosto has a unique 10% promo at 5-9 nights)', () => {
    const config = buildConfig({
      seasons: [
        ...buildConfig().seasons,
        {
          id: 'season-other',
          name: 'Otra temporada',
          start_date: '2026-09-01',
          end_date: '2026-10-31',
          salon_per_day: SALON_PER_DAY,
          food_price_per_person_per_night: FOOD_PP,
          meat_base_price: 23000,
          sort_order: 2,
          synced_at: '',
        },
      ],
      accommodationRates: [
        ...buildConfig().accommodationRates,
        { id: 'rate-other', season_id: 'season-other', accommodation_type_id: TRAILER_ID, lodging_rate_per_night: TRAILER_LODGING, synced_at: '' },
      ],
      nightsDiscounts: [
        ...buildConfig().nightsDiscounts,
        { id: 'other-1', season_id: 'season-other', min_nights: 1, max_nights: 2, discount_pct: 0 },
        { id: 'other-2', season_id: 'season-other', min_nights: 5, max_nights: 9, discount_pct: 5 }, // standard, not the JUL-AGO26 promo
      ],
    });

    const julAgo = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 6, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 1 }], mealPlan: null },
      config,
    );
    const other = calculateQuote(
      { retreatStartDate: '2026-09-10', nights: 6, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 1 }], mealPlan: null },
      config,
    );

    expect(julAgo.nightsDiscountPct).toBe(10);
    expect(other.nightsDiscountPct).toBe(5);
  });

  it('applies headcount discount tiers inclusively (16-25:3%, 26-40:6%, 41+:10%)', () => {
    const config = buildConfig();
    const at16 = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 1, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 16 }], mealPlan: null },
      config,
    );
    const at15 = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 1, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 15 }], mealPlan: null },
      config,
    );

    expect(at16.headcountDiscountPct).toBe(3); // >=16 qualifies (inclusive), not just >16
    expect(at15.headcountDiscountPct).toBe(0);
  });

  it('adds salon cost once per distinct accommodation line with a nonzero quantity', () => {
    const config = buildConfig();
    const oneType = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 2, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 2 }], mealPlan: null },
      config,
    );
    const twoTypes = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [
          { accommodationTypeId: TRAILER_ID, units: 1 },
          { accommodationTypeId: CABINT_INDIVIDUAL_ID, units: 1 },
        ],
        mealPlan: null,
      },
      config,
    );

    const salonShareOneType = (SALON_PER_DAY * 2) / oneType.totalPeople;
    const salonShareTwoTypes = (SALON_PER_DAY * 2) / twoTypes.totalPeople;
    expect(oneType.salonCostTotal).toBe(Math.round(salonShareOneType));
    expect(twoTypes.salonCostTotal).toBe(Math.round(salonShareTwoTypes * 2));
  });

  it('subtracts a "liberados" bonification for 16+ pax that DOES scale with nights (unlike the other two discounts)', () => {
    const config = buildConfig();
    const result16 = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 3, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 16 }], mealPlan: null },
      config,
    );
    const result15 = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 3, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 15 }], mealPlan: null },
      config,
    );

    expect(result15.liberadosMultiplier).toBe(0);
    expect(result16.liberadosMultiplier).toBe(1); // 16-23 pax tier
    // Unlike nightsDiscountAmount/headcountDiscountAmount, this one scales
    // with nights: unitCost = trailer_x1 lodging*IVA*nights + its own salon share.
    const expectedUnitCost = Math.round(TRAILER_LODGING * 1.21 * 3 + (SALON_PER_DAY * 3) / 16);
    expect(result16.liberadosUnitCost).toBe(expectedUnitCost);
    expect(result16.liberadosDiscountAmount).toBe(expectedUnitCost);
    expect(result16.subtotalAfterDiscounts).toBe(result16.grossBeforeDiscount - result16.totalDiscounts);
  });

  it('splits the final total as 30% seña (no discount) + 70% cash with a 20% discount', () => {
    const config = buildConfig();
    const result = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 2, accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }], mealPlan: null },
      config,
    );

    expect(result.depositAmount).toBe(Math.round(result.subtotalAfterDiscounts * 0.3));
    expect(result.balanceOnArrival).toBe(Math.round(result.subtotalAfterDiscounts * 0.7 * 0.8));
    expect(result.totalACobrar).toBe(result.depositAmount + result.balanceOnArrival);
  });

  it('computes the carne addon unit prices via the confirmed formula and only charges it for "solo almuerzo" once per night', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }],
        mealPlan: 'lunch_only',
        meat200gCount: 4,
        meat400gCount: 0,
      },
      config,
    );

    const ivaMultiplier = 1.21;
    const rawUnit200g = (MEAT_BASE * 1.1 * 1.3 - MEAT_BASE) * ivaMultiplier;
    expect(result.mealAddon.unitPrice200g).toBe(Math.round(rawUnit200g));
    // Rounded once at the end (full precision through the multiplication),
    // not per-unit-price -- matches the implementation's rounding order.
    expect(result.mealAddon.total).toBe(Math.round(rawUnit200g * 1 * 2 * 4)); // 1 comida/noche * nights * personas
    expect(result.total).toBe(result.totalACobrar + result.mealAddon.total);
  });

  it('charges "almuerzo y cena" at 2 comidas-con-carne per night', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }],
        mealPlan: 'lunch_dinner',
        meat400gCount: 4,
      },
      config,
    );

    const ivaMultiplier = 1.21;
    const rawUnit400g = (MEAT_BASE * 1.1 * 1.6 - MEAT_BASE) * ivaMultiplier;
    expect(result.mealAddon.total).toBe(Math.round(rawUnit400g * 2 * 1 * 4));
  });

  it('charges "pensión completa" at the fixed premium×2 + item×1 blend for the whole group, with no pure-200g option', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }],
        mealPlan: 'full_board',
      },
      config,
    );

    const ivaMultiplier = 1.21;
    const unit200g = (MEAT_BASE * 1.1 * 1.3 - MEAT_BASE) * ivaMultiplier;
    const unit400g = (MEAT_BASE * 1.1 * 1.6 - MEAT_BASE) * ivaMultiplier;
    const perPerson = unit400g * 2 + unit200g * 1;
    expect(result.mealAddon.total).toBe(Math.round(perPerson * 1 * result.totalPeople));
  });

  it('flags a capacity warning when a shared unit pool is exceeded, without blocking the calculation', () => {
    const config = buildConfig();
    const result = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 1, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 9 }], mealPlan: null }, // > 8 trailers
      config,
    );

    expect(result.capacityWarnings.length).toBeGreaterThan(0);
    expect(result.capacityWarnings[0]).toMatchObject({ category: 'trailer', used: 9, max: 8 });
    expect(result.total).toBeGreaterThan(0);
  });

  it('assigns Nave for large groups and Nodriza for small groups within its range', () => {
    const config = buildConfig();
    const nave = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 2, accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 5 }], mealPlan: null }, // 20 people
      config,
    );
    expect(nave.salon.salonCode).toBe('nave');
    expect(nave.salonAdjustmentAmount).toBe(0);

    const nodriza = calculateQuote(
      { retreatStartDate: '2026-08-10', nights: 2, accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 10 }], mealPlan: null },
      config,
    );
    expect(nodriza.salon.salonCode).toBe('nodriza');
    expect(nodriza.salonAdjustmentAmount).toBe(-250000);
  });

  it('applies a staff manual adjustment with its note on top of everything else', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }],
        mealPlan: null,
        manualAdjustment: { amount: -50000, note: 'Descuento negociado extra' },
      },
      config,
    );

    expect(result.manualAdjustmentAmount).toBe(-50000);
    expect(result.manualAdjustmentNote).toBe('Descuento negociado extra');
    expect(result.total).toBe(result.totalACobrar + result.mealAddon.total + result.salonAdjustmentAmount - 50000);
  });

  it('throws a clear error when the retreat date falls outside every configured season', () => {
    const config = buildConfig();
    expect(() =>
      calculateQuote(
        {
          retreatStartDate: '2027-06-01',
          nights: 1,
          accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 2 }],
          mealPlan: null,
        },
        config,
      ),
    ).toThrow(/temporada/i);
  });
});
