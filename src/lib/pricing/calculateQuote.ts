import type { PricingConfig, QuoteInput, QuoteResult, SalonAssignment } from './types';

function round(n: number): number {
  return Math.round(n);
}

function resolveSeason(config: PricingConfig, retreatStartDate: string) {
  const season = config.seasons.find(
    (s) => retreatStartDate >= s.start_date && retreatStartDate <= s.end_date,
  );
  if (!season) {
    throw new Error(
      `No hay una temporada configurada que cubra la fecha ${retreatStartDate}. Revisá la pestaña Tarifas_App.`,
    );
  }
  return season;
}

function isLongWeekend(retreatStartDate: string, nights: number, longWeekendDates: string[]): boolean {
  const start = new Date(retreatStartDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + nights);

  return longWeekendDates.some((d) => {
    const date = new Date(d + 'T00:00:00');
    return date >= start && date < end;
  });
}

function assignSalon(
  config: PricingConfig,
  totalPeople: number,
  nights: number,
  retreatStartDate: string,
  longWeekendDates: string[],
): SalonAssignment {
  const nave = config.salonThresholds.find((s) => s.salon_code === 'nave');
  const nodriza = config.salonThresholds.find((s) => s.salon_code === 'nodriza');
  const longWeekend = isLongWeekend(retreatStartDate, nights, longWeekendDates);

  if (nave) {
    const qualifiesNave = longWeekend
      ? nights >= (nave.long_weekend_min_nights ?? nave.min_people) &&
        totalPeople >= (nave.long_weekend_min_people ?? nave.min_people)
      : totalPeople >= nave.min_people;

    if (qualifiesNave) {
      return { salonCode: 'nave', label: nave.label, warning: null, flatAdjustment: nave.flat_adjustment };
    }
  }

  if (nodriza) {
    const withinRange =
      totalPeople >= nodriza.min_people && (nodriza.max_people == null || totalPeople <= nodriza.max_people);
    if (withinRange) {
      return {
        salonCode: 'nodriza',
        label: nodriza.label,
        warning: null,
        flatAdjustment: nodriza.flat_adjustment,
      };
    }
  }

  return {
    salonCode: null,
    label: null,
    warning:
      'La cantidad de personas queda fuera de los rangos estándar de salón (Nave/Nodriza). Confirmar disponibilidad con el equipo de Umepay.',
    flatAdjustment: 0,
  };
}

/** 1, 0.97, 0.95 or 0.9 -- multiplies the subtotal, it is not a "% off" to add to anything else. */
function nightsMultiplierFor(config: PricingConfig, nights: number): number {
  const tier = config.nightsDiscounts.find(
    (t) => nights >= t.min_nights && (t.max_nights == null || nights <= t.max_nights),
  );
  return 1 - (tier?.discount_pct ?? 0) / 100;
}

/** 1, 0.97, 0.94 or 0.9 -- multiplies the (already nights-discounted) subtotal. */
function headcountMultiplierFor(config: PricingConfig, totalPeople: number): number {
  const qualifying = config.headcountDiscounts.filter((t) => totalPeople > t.min_people);
  const pct = qualifying.length === 0 ? 0 : Math.max(...qualifying.map((t) => t.discount_pct));
  return 1 - pct / 100;
}

/**
 * Pure, side-effect-free quote calculator. Rebuilt from the actual cell
 * formulas of the real monthly "cotizador" tabs that Centro Umepay staff
 * currently use to quote clients (JULIO-AGOSTO..ENE-FEB27) -- NOT the older,
 * generic "cotizador" master template, which computes differently and is no
 * longer how real quotes are built. Verified peso-for-peso against a
 * controlled side-by-side test (5x trailer individual + 1x cabaña interior
 * cuádruple + 1x cabaña exterior cuádruple, 13 personas, 2 noches,
 * Julio-Agosto 2026): reproduces the real spreadsheet's $3,847,162
 * pre-split subtotal and $3,308,560 final total exactly.
 *
 * Key points, all confirmed against that real formula:
 * - Accommodation is priced per whole unit/configuration (e.g. a "cuádruple"
 *   cabin has one combined rate for the whole cabin), not a flat per-person
 *   rate. That combined rate already includes the configuration's base
 *   vegetarian food.
 * - IVA (21%) is applied PER ACCOMMODATION LINE (units * rate * nights *
 *   1.21) -- not as a separate 50%-of-subtotal step at the end. There is no
 *   separate "logística" fee in the real monthly tabs (only the old master
 *   template had one).
 * - Salon usage (salon_per_day * nights / totalPeople) is added once for
 *   EACH DISTINCT accommodation line with a nonzero quantity -- an unusual
 *   quirk of the real sheet, but verified to reproduce it exactly.
 * - The nights discount and the headcount discount combine MULTIPLICATIVELY
 *   (sequential), not additively.
 * - Meal add-ons (carne surcharge, extra standalone meals) are NOT
 *   discounted -- they're added after both discounts.
 * - The final total is NOT a 50/50 transfer-vs-cash split: it's
 *   deposit_pct% paid as a seña (no discount) + the rest paid in cash on
 *   arrival with a cash_discount_pct% discount. Both intermediate amounts
 *   (deposit + balance) sum exactly to the total, by construction.
 */
export function calculateQuote(input: QuoteInput, config: PricingConfig): QuoteResult {
  const season = resolveSeason(config, input.retreatStartDate);
  const ivaPct = config.settings.iva_pct;
  const ivaMultiplier = 1 + ivaPct / 100;

  const accommodationLines = input.accommodationMix.map((entry) => {
    const accType = config.accommodationTypes.find((a) => a.id === entry.accommodationTypeId);
    if (!accType) {
      throw new Error(`Tipo de alojamiento desconocido: ${entry.accommodationTypeId}`);
    }
    const rate = config.accommodationRates.find(
      (r) => r.season_id === season.id && r.accommodation_type_id === accType.id,
    );
    if (!rate) {
      throw new Error(`No hay tarifa configurada para ${accType.label} en la temporada ${season.name}.`);
    }
    const capacity = accType.max_capacity;
    const peopleAssigned = entry.units * capacity;
    const lineTotal = entry.units * rate.combined_rate_per_night * input.nights * ivaMultiplier;
    return {
      accommodationTypeId: accType.id,
      label: accType.label,
      units: entry.units,
      capacity,
      peopleAssigned,
      combinedRatePerNight: rate.combined_rate_per_night,
      lineTotal: round(lineTotal),
    };
  });

  const nonzeroLines = accommodationLines.filter((l) => l.units > 0);
  const baseAccommodationTotal = round(accommodationLines.reduce((sum, l) => sum + l.lineTotal, 0));
  const totalPeople = accommodationLines.reduce((sum, l) => sum + l.peopleAssigned, 0);

  const salon = assignSalon(
    config,
    totalPeople,
    input.nights,
    input.retreatStartDate,
    input.longWeekendDates ?? [],
  );

  const salonSharePerLine = totalPeople > 0 ? (season.salon_per_day * input.nights) / totalPeople : 0;
  const salonCostTotal = round(salonSharePerLine * nonzeroLines.length);
  const grossBeforeDiscount = baseAccommodationTotal + salonCostTotal;

  const nightsMultiplier = nightsMultiplierFor(config, input.nights);
  const headcountMultiplier = headcountMultiplierFor(config, totalPeople);
  const nightsDiscountPct = round((1 - nightsMultiplier) * 100);
  const headcountDiscountPct = round((1 - headcountMultiplier) * 100);

  const subtotalAfterDiscounts = round(grossBeforeDiscount * nightsMultiplier * headcountMultiplier);
  const discountAmount = grossBeforeDiscount - subtotalAfterDiscounts;

  let mealTierLabel: string | null = null;
  let mealSurchargeTotal = 0;
  if (input.mealTierId) {
    const tier = config.mealTiers.find((t) => t.id === input.mealTierId);
    if (!tier) {
      throw new Error(`Nivel de comida desconocido: ${input.mealTierId}`);
    }
    mealTierLabel = tier.label;
    mealSurchargeTotal = round(totalPeople * tier.surcharge_per_person_total);
  }

  const extraMealsCount = input.extraMealsCount ?? 0;
  const extraMealsTotal = round(extraMealsCount * config.settings.extra_meal_price);

  const salonAdjustmentAmount = salon.flatAdjustment;
  const manualAdjustmentAmount = input.manualAdjustment?.amount ?? 0;
  const manualAdjustmentNote = input.manualAdjustment?.note ?? null;

  const adjustedTotal =
    subtotalAfterDiscounts + mealSurchargeTotal + extraMealsTotal + salonAdjustmentAmount + manualAdjustmentAmount;

  // Confirmed real payment structure (not a 50/50 transfer-vs-cash split):
  // deposit_pct% as seña at face value, the rest paid in cash on arrival
  // with a cash_discount_pct% discount.
  const depositPct = config.settings.deposit_pct;
  const cashDiscountPct = config.settings.cash_discount_pct;
  const depositAmount = round(adjustedTotal * (depositPct / 100));
  const balanceOnArrival = round(adjustedTotal * (1 - depositPct / 100) * (1 - cashDiscountPct / 100));
  const total = depositAmount + balanceOnArrival;

  return {
    seasonName: season.name,
    totalPeople,
    nights: input.nights,
    accommodationLines,
    baseAccommodationTotal,
    ivaPct,
    salonCostTotal,
    salon,
    grossBeforeDiscount,
    nightsDiscountPct,
    headcountDiscountPct,
    discountAmount,
    subtotalAfterDiscounts,
    mealTierLabel,
    mealSurchargeTotal,
    extraMealsCount,
    extraMealsTotal,
    adjustedTotal,
    salonAdjustmentAmount,
    manualAdjustmentAmount,
    manualAdjustmentNote,
    depositPct,
    cashDiscountPct,
    depositAmount,
    balanceOnArrival,
    total,
  };
}
