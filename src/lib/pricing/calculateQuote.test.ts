import { describe, expect, it } from 'vitest';
import { calculateQuote } from './calculateQuote';
import type { PricingConfig } from './types';

const SEASON_ID = 'season-1';
const TRAILER_ID = 'acc-trailer'; // capacity 1
const CABINT_QUAD_ID = 'acc-cabint-quad'; // capacity 4
const CABEXT_QUAD_ID = 'acc-cabext-quad'; // capacity 4
const MEAL_FULL_PREMIUM_ID = 'meal-full-premium';

// Real Julio-Agosto 2026 values, confirmed by reading the actual cell
// formulas (not just displayed values) of that real monthly tab, and
// cross-checked peso-for-peso against a controlled side-by-side test the
// user ran on both the app and the real spreadsheet at the same time.
const SALON_PER_DAY = 181500;
const TRAILER_RATE = 122454.99; // "trailer x1"
const CABINT_QUAD_RATE = 497390.8275; // "cabaña con baño interior · cuádruple"
const CABEXT_QUAD_RATE = 445455.36; // "cabaña con baño exterior · cuádruple"

function buildConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    seasons: [{ id: SEASON_ID, name: 'Julio-Agosto 2026', start_date: '2026-07-01', end_date: '2026-08-31', salon_per_day: SALON_PER_DAY, sort_order: 1, synced_at: '' }],
    accommodationTypes: [
      { id: TRAILER_ID, code: 'trailer_x1', label: 'Trailer individual', min_capacity: 1, max_capacity: 1, total_units: 8, bathroom_type: 'exterior', sort_order: 1 },
      { id: CABINT_QUAD_ID, code: 'cabint_cuadruple', label: 'Cabaña con baño interior · cuádruple', min_capacity: 4, max_capacity: 4, total_units: 5, bathroom_type: 'interior', sort_order: 2 },
      { id: CABEXT_QUAD_ID, code: 'cabext_cuadruple', label: 'Cabaña con baño exterior · cuádruple', min_capacity: 4, max_capacity: 4, total_units: 3, bathroom_type: 'exterior', sort_order: 3 },
    ],
    accommodationRates: [
      { id: 'rate-1', season_id: SEASON_ID, accommodation_type_id: TRAILER_ID, combined_rate_per_night: TRAILER_RATE, synced_at: '' },
      { id: 'rate-2', season_id: SEASON_ID, accommodation_type_id: CABINT_QUAD_ID, combined_rate_per_night: CABINT_QUAD_RATE, synced_at: '' },
      { id: 'rate-3', season_id: SEASON_ID, accommodation_type_id: CABEXT_QUAD_ID, combined_rate_per_night: CABEXT_QUAD_RATE, synced_at: '' },
    ],
    mealTiers: [
      { id: MEAL_FULL_PREMIUM_ID, code: 'full', label: 'Todas las comidas (premium)', protein_tier: 'premium_400g', surcharge_per_person_total: 32000, sort_order: 1 },
    ],
    nightsDiscounts: [
      { id: 'n1', min_nights: 1, max_nights: 2, discount_pct: 0 },
      { id: 'n2', min_nights: 3, max_nights: 4, discount_pct: 3 },
      { id: 'n3', min_nights: 5, max_nights: 9, discount_pct: 5 },
      { id: 'n4', min_nights: 10, max_nights: null, discount_pct: 10 },
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
      cash_discount_pct: 20,
      extra_meal_price: 24485.2,
      synced_at: '',
    },
    ...overrides,
  };
}

describe('calculateQuote', () => {
  it('reproduces a real side-by-side spreadsheet test exactly: 5 trailer + 1 cabaña interior cuádruple + 1 cabaña exterior cuádruple, 13 personas, 2 noches', () => {
    // Verified against the real JUL-AGO26 tab: gross before discount (Excel's
    // "Valor total con descuentos incluidos") = $3,847,162, and the final
    // total (Excel's "TOTAL", the 30% seña + 70%-with-20%-off split) =
    // $3,308,560 -- both reproduced here to the peso. Salon thresholds are
    // zeroed out in this test to isolate the core formula from the separate
    // Nodriza business-rule adjustment (verified in its own test below).
    const config = buildConfig({
      salonThresholds: [
        { id: 's1', salon_code: 'nave', label: 'Nave', min_people: 16, max_people: null, long_weekend_min_nights: 3, long_weekend_min_people: 20, flat_adjustment: 0 },
        { id: 's2', salon_code: 'nodriza', label: 'Nodriza', min_people: 8, max_people: 14, long_weekend_min_nights: null, long_weekend_min_people: null, flat_adjustment: 0 },
      ],
    });

    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [
          { accommodationTypeId: TRAILER_ID, units: 5 },
          { accommodationTypeId: CABINT_QUAD_ID, units: 1 },
          { accommodationTypeId: CABEXT_QUAD_ID, units: 1 },
        ],
        mealTierId: null,
      },
      config,
    );

    expect(result.totalPeople).toBe(13);
    expect(result.grossBeforeDiscount).toBe(3847162);
    expect(result.subtotalAfterDiscounts).toBe(3847162); // 13 people / 2 nights trigger no discount tier
    expect(result.total).toBe(3308560);
    expect(result.depositAmount + result.balanceOnArrival).toBe(result.total);
  });

  it('applies IVA per accommodation line, not as a separate 50%-of-subtotal step', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 1 }],
        mealTierId: null,
      },
      config,
    );

    const expectedLine = Math.round(1 * TRAILER_RATE * 2 * 1.21);
    expect(result.accommodationLines[0].lineTotal).toBe(expectedLine);
    expect(result.baseAccommodationTotal).toBe(expectedLine);
  });

  it('adds salon cost once per distinct accommodation line with a nonzero quantity', () => {
    const config = buildConfig();
    const oneType = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 2 }],
        mealTierId: null,
      },
      config,
    );
    const twoTypes = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [
          { accommodationTypeId: TRAILER_ID, units: 1 },
          { accommodationTypeId: CABINT_QUAD_ID, units: 1 },
        ],
        mealTierId: null,
      },
      config,
    );

    // Same-ish scale, but twoTypes has salon added twice (one per line) vs oneType's once.
    const salonShareOneType = (SALON_PER_DAY * 2) / oneType.totalPeople;
    const salonShareTwoTypes = (SALON_PER_DAY * 2) / twoTypes.totalPeople;
    expect(oneType.salonCostTotal).toBe(Math.round(salonShareOneType));
    expect(twoTypes.salonCostTotal).toBe(Math.round(salonShareTwoTypes * 2));
  });

  it('combines nights and headcount discounts multiplicatively, not additively', () => {
    const config = buildConfig();
    // 7 quad units = 28 people (>26, 6% headcount discount), 10 nights (10% nights discount)
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 10,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 7 }],
        mealTierId: null,
      },
      config,
    );

    const nightsMultiplier = 0.9;
    const headcountMultiplier = 0.94;
    const expectedMultiplicative = Math.round(result.grossBeforeDiscount * nightsMultiplier * headcountMultiplier);
    const naiveAdditive = Math.round(result.grossBeforeDiscount * (1 - 0.1 - 0.06));

    expect(result.subtotalAfterDiscounts).toBe(expectedMultiplicative);
    expect(result.subtotalAfterDiscounts).not.toBe(naiveAdditive);
  });

  it('assigns Nave for large groups and Nodriza for small groups within its range', () => {
    const config = buildConfig();
    const nave = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 5 }], // 20 people
        mealTierId: null,
      },
      config,
    );
    expect(nave.salon.salonCode).toBe('nave');
    expect(nave.salonAdjustmentAmount).toBe(0);

    const nodriza = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 10 }],
        mealTierId: null,
      },
      config,
    );
    expect(nodriza.salon.salonCode).toBe('nodriza');
    expect(nodriza.salonAdjustmentAmount).toBe(-250000);
    expect(nodriza.adjustedTotal).toBe(nodriza.subtotalAfterDiscounts - 250000);
  });

  it('flags an out-of-range group (between Nodriza max and Nave min) with a warning, but still computes a price', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 15 }],
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
    const longWeekendDates = ['2026-08-14'];

    const tooShort = calculateQuote(
      {
        retreatStartDate: '2026-08-14',
        nights: 2,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 6 }], // 24 people
        mealTierId: null,
        longWeekendDates,
      },
      config,
    );
    expect(tooShort.salon.salonCode).not.toBe('nave');

    const qualifies = calculateQuote(
      {
        retreatStartDate: '2026-08-14',
        nights: 3,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 5 }], // 20 people
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
        retreatStartDate: '2026-08-10',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }],
        mealTierId: MEAL_FULL_PREMIUM_ID,
        extraMealsCount: 2,
      },
      config,
    );

    expect(withMeat.mealSurchargeTotal).toBe(4 * 32000);
    expect(withMeat.extraMealsTotal).toBe(Math.round(2 * 24485.2));
    expect(withMeat.adjustedTotal).toBe(
      withMeat.subtotalAfterDiscounts + withMeat.mealSurchargeTotal + withMeat.extraMealsTotal + withMeat.salonAdjustmentAmount,
    );
  });

  it('applies a staff manual adjustment with its note, and deposit+balance always sum to the total', () => {
    const config = buildConfig();
    const result = calculateQuote(
      {
        retreatStartDate: '2026-08-10',
        nights: 1,
        accommodationMix: [{ accommodationTypeId: CABINT_QUAD_ID, units: 1 }],
        mealTierId: null,
        manualAdjustment: { amount: -50000, note: 'Alojamiento gratis para el facilitador' },
      },
      config,
    );

    expect(result.manualAdjustmentAmount).toBe(-50000);
    expect(result.manualAdjustmentNote).toBe('Alojamiento gratis para el facilitador');
    expect(result.depositAmount + result.balanceOnArrival).toBe(result.total);
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
          accommodationMix: [{ accommodationTypeId: TRAILER_ID, units: 2 }],
          mealTierId: null,
        },
        config,
      ),
    ).toThrow(/temporada/i);
  });
});
