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

/** 1, 0.9, 0.8 or 0.7 -- multiplies the subtotal, it is not a "% off" to add to anything else. */
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
 * Pure, side-effect-free quote calculator, rebuilt directly from the actual
 * cell formulas in the Centro Umepay master "cotizador" spreadsheet tab
 * (not just its displayed values). Key points confirmed against that sheet:
 *
 * - Accommodation is priced per whole unit/configuration (e.g. a "cuádruple"
 *   cabin has one combined rate for the whole cabin), not a flat per-person
 *   rate -- see accommodationRates.combined_rate_per_night. That combined
 *   rate already includes the configuration's base vegetarian food.
 * - Salon usage (per night) and "apoyo difusión y logística" (once per
 *   stay) are fixed costs present on every quote.
 * - The nights discount and the headcount discount combine MULTIPLICATIVELY
 *   (sequential), not additively.
 * - Meal add-ons (carne surcharge, extra standalone meals) are NOT
 *   discounted -- they're added after both discounts, then the whole thing
 *   goes through the standard 50%-with-IVA / 50%-without-IVA split.
 */
export function calculateQuote(input: QuoteInput, config: PricingConfig): QuoteResult {
  const season = resolveSeason(config, input.retreatStartDate);

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
    const lineTotal = entry.units * rate.combined_rate_per_night * input.nights;
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

  const baseAccommodationTotal = round(accommodationLines.reduce((sum, l) => sum + l.lineTotal, 0));
  const totalPeople = accommodationLines.reduce((sum, l) => sum + l.peopleAssigned, 0);

  const salon = assignSalon(
    config,
    totalPeople,
    input.nights,
    input.retreatStartDate,
    input.longWeekendDates ?? [],
  );

  const salonCostTotal = round(config.settings.salon_per_day * input.nights);
  const logisticsCostTotal = round(config.settings.logistics_flat);
  const grossBeforeDiscount = baseAccommodationTotal + salonCostTotal + logisticsCostTotal;

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

  const cashTotalWithAddons = subtotalAfterDiscounts + mealSurchargeTotal + extraMealsTotal;

  // Standard payment condition: 50% by bank transfer (with IVA) + 50% cash
  // (without IVA). Confirmed against a real Umepay quote example (21% IVA on
  // exactly 50% of the subtotal reproduces the real transfer-vs-cash totals),
  // so this is fixed, not a client-facing toggle.
  const ivaPct = config.settings.iva_pct;
  const ivaAmount = round(cashTotalWithAddons * 0.5 * (ivaPct / 100));

  // Salon adjustment (Nodriza's flat discount) and any staff-entered
  // exception both apply to the final total, per Umepay's own framing
  // ("discount X off the retreat's total"), not to the pre-IVA subtotal.
  const salonAdjustmentAmount = salon.flatAdjustment;
  const manualAdjustmentAmount = input.manualAdjustment?.amount ?? 0;
  const manualAdjustmentNote = input.manualAdjustment?.note ?? null;

  const total = cashTotalWithAddons + ivaAmount + salonAdjustmentAmount + manualAdjustmentAmount;

  const depositPct = config.settings.deposit_pct;
  const depositAmount = round(total * (depositPct / 100));
  const balanceOnArrival = total - depositAmount;

  return {
    seasonName: season.name,
    totalPeople,
    nights: input.nights,
    accommodationLines,
    baseAccommodationTotal,
    salonCostTotal,
    logisticsCostTotal,
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
    cashTotalWithAddons,
    ivaPct,
    ivaAmount,
    salonAdjustmentAmount,
    manualAdjustmentAmount,
    manualAdjustmentNote,
    total,
    depositPct,
    depositAmount,
    balanceOnArrival,
  };
}
