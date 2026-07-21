import type { PricingConfig, QuoteInput, QuoteResult, SalonAssignment, CapacityWarning, MealAddonBreakdown } from './types';

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

// Shared physical unit pools -- confirmed with Rochi. Exceeding these doesn't
// block the quote, it just shows a warning (matches the Excel's behavior of
// showing an error banner instead of blocking input).
const CATEGORY_CAPS: Record<string, number> = {
  trailer: 8,
  cabin_interior: 5,
  cabin_exterior: 3,
};

function checkCapacityWarnings(
  config: PricingConfig,
  mix: { accommodationTypeId: string; units: number }[],
): CapacityWarning[] {
  const warnings: CapacityWarning[] = [];
  const usedByCategory = new Map<string, number>();

  for (const entry of mix) {
    const accType = config.accommodationTypes.find((a) => a.id === entry.accommodationTypeId);
    if (!accType) continue;
    usedByCategory.set(accType.category, (usedByCategory.get(accType.category) ?? 0) + entry.units);
  }

  for (const [category, used] of usedByCategory) {
    const max = CATEGORY_CAPS[category];
    if (max != null && used > max) {
      warnings.push({ category, used, max });
    }
  }

  // Exterior cabins: at most 1 unit configured for 5 people, at most 1 for 6.
  for (const code of ['cabext_quintuple', 'cabext_sextuple']) {
    const entry = mix.find((m) => {
      const accType = config.accommodationTypes.find((a) => a.id === m.accommodationTypeId);
      return accType?.code === code;
    });
    if (entry && entry.units > 1) {
      warnings.push({ category: code, used: entry.units, max: 1 });
    }
  }

  return warnings;
}

/** 1, 0.97, 0.9 or 0.95/0.9 depending on season -- multiplies lodgingOneNightTotal, not the gross. */
function nightsDiscountPctFor(config: PricingConfig, seasonId: string, nights: number): number {
  const tier = config.nightsDiscounts.find(
    (t) => t.season_id === seasonId && nights >= t.min_nights && (t.max_nights == null || nights <= t.max_nights),
  );
  return tier?.discount_pct ?? 0;
}

function headcountDiscountPctFor(config: PricingConfig, totalPeople: number): number {
  const qualifying = config.headcountDiscounts.filter((t) => totalPeople >= t.min_people);
  if (qualifying.length === 0) return 0;
  return Math.max(...qualifying.map((t) => t.discount_pct));
}

function liberadosMultiplierFor(config: PricingConfig, totalPeople: number): number {
  const tier = config.liberadosTiers.find(
    (t) => totalPeople >= t.min_people && (t.max_people == null || totalPeople <= t.max_people),
  );
  return tier?.multiplier ?? 0;
}

/** ((precio_base_carne * 1.1) * factor - precio_base_carne) * 1.21 */
function carneUnitPrice(meatBasePrice: number, factor: number, ivaMultiplier: number): number {
  return (meatBasePrice * 1.1 * factor - meatBasePrice) * ivaMultiplier;
}

function calculateMealAddon(
  input: QuoteInput,
  totalPeople: number,
  nights: number,
  meatBasePrice: number,
  ivaMultiplier: number,
): MealAddonBreakdown {
  const meat200gCount = input.meat200gCount ?? 0;
  const meat400gCount = input.meat400gCount ?? 0;
  const unitPrice200g = carneUnitPrice(meatBasePrice, 1.3, ivaMultiplier);
  const unitPrice400g = carneUnitPrice(meatBasePrice, 1.6, ivaMultiplier);

  let total = 0;
  if (input.mealPlan === 'lunch_only') {
    total = unitPrice200g * 1 * nights * meat200gCount + unitPrice400g * 1 * nights * meat400gCount;
  } else if (input.mealPlan === 'lunch_dinner') {
    total = unitPrice200g * 2 * nights * meat200gCount + unitPrice400g * 2 * nights * meat400gCount;
  } else if (input.mealPlan === 'full_board') {
    // Confirmed as-is from the real formula: pensión completa always bills at
    // the blended premium+item rate, no separate pure-200g option -- applies
    // to whoever is on this plan (the whole group, since "todo el grupo debe
    // elegir el mismo plan de comidas sin excepción").
    const perPerson = unitPrice400g * 2 + unitPrice200g * 1;
    total = perPerson * nights * totalPeople;
  }

  return {
    plan: input.mealPlan ?? null,
    meat200gCount,
    meat400gCount,
    unitPrice200g: round(unitPrice200g),
    unitPrice400g: round(unitPrice400g),
    total: round(total),
  };
}

/**
 * Pure, side-effect-free quote calculator. Implements the "cotizador grupal"
 * exactly as specified in the authoritative reference derived from the real
 * spreadsheet's formulas (JUL-AGO26 tab as the template, cross-checked
 * against SEP-OCT26/NOV-DIC26/ENE-FEB27), confirmed point-by-point with
 * Centro Umepay staff. Key points:
 *
 * - Lodging and food are priced SEPARATELY per accommodation line, each with
 *   IVA (21%) applied independently -- not a single combined+taxed rate.
 * - The nights and headcount discounts are computed on ONE NIGHT of
 *   lodging-only cost (not the multi-night, food-inclusive gross) -- the
 *   discount amount does not scale with the number of nights.
 * - Nights discount tiers are per-season (one season currently has a unique
 *   promo at the 5-9 night tier).
 * - Salon usage (salon_per_day * nights / totalPeople) is added once for
 *   EACH DISTINCT accommodation line with a nonzero quantity.
 * - "Liberados": 16+ pax groups get a bonification (subtracted) equal to
 *   1-3x the cost of a "trailer x1" line, tiered by headcount.
 * - The final payment split is fixed: 30% seña (no discount) + 70% paid in
 *   cash on arrival with a 20% discount -- not a 50/50 transfer/cash split.
 * - The carne addon (200g/400g) is computed via a fixed formula from each
 *   season's meat_base_price, and added on top of the total, varying by
 *   which of the 3 meal plans the group chose.
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
    const foodPerUnitPerNight = season.food_price_per_person_per_night * capacity;

    return {
      accommodationTypeId: accType.id,
      label: accType.label,
      units: entry.units,
      capacity,
      peopleAssigned,
      lodgingRatePerNight: rate.lodging_rate_per_night,
      lodgingLineTotal: round(entry.units * rate.lodging_rate_per_night * input.nights * ivaMultiplier),
      foodLineTotal: round(entry.units * foodPerUnitPerNight * input.nights * ivaMultiplier),
      lodgingOneNight: round(entry.units * rate.lodging_rate_per_night * ivaMultiplier),
    };
  });

  const nonzeroLines = accommodationLines.filter((l) => l.units > 0);
  const totalPeople = accommodationLines.reduce((sum, l) => sum + l.peopleAssigned, 0);
  const accommodationTotal = round(accommodationLines.reduce((sum, l) => sum + l.lodgingLineTotal, 0));
  const foodTotal = round(accommodationLines.reduce((sum, l) => sum + l.foodLineTotal, 0));
  const lodgingOneNightTotal = round(accommodationLines.reduce((sum, l) => sum + l.lodgingOneNight, 0));

  const salon = assignSalon(
    config,
    totalPeople,
    input.nights,
    input.retreatStartDate,
    input.longWeekendDates ?? [],
  );
  const capacityWarnings = checkCapacityWarnings(config, input.accommodationMix);

  const salonSharePerLine = totalPeople > 0 ? (season.salon_per_day * input.nights) / totalPeople : 0;
  const salonCostTotal = round(salonSharePerLine * nonzeroLines.length);

  const grossBeforeDiscount = accommodationTotal + foodTotal + salonCostTotal;

  const nightsDiscountPct = nightsDiscountPctFor(config, season.id, input.nights);
  const headcountDiscountPct = headcountDiscountPctFor(config, totalPeople);
  const nightsDiscountAmount = round(lodgingOneNightTotal * (nightsDiscountPct / 100));
  const headcountDiscountAmount = round(lodgingOneNightTotal * (headcountDiscountPct / 100));

  const trailerX1 = config.accommodationTypes.find((a) => a.code === 'trailer_x1');
  const trailerX1Rate = trailerX1
    ? config.accommodationRates.find((r) => r.season_id === season.id && r.accommodation_type_id === trailerX1.id)
    : undefined;
  const liberadosMultiplier = liberadosMultiplierFor(config, totalPeople);
  const liberadosUnitCost = trailerX1Rate
    ? round(trailerX1Rate.lodging_rate_per_night * ivaMultiplier * input.nights + salonSharePerLine)
    : 0;
  const liberadosDiscountAmount = liberadosMultiplier * liberadosUnitCost;

  const totalDiscounts = nightsDiscountAmount + headcountDiscountAmount + liberadosDiscountAmount;
  const subtotalAfterDiscounts = grossBeforeDiscount - totalDiscounts;

  const depositPct = config.settings.deposit_pct;
  const cashDiscountPct = config.settings.cash_discount_pct;
  const depositAmount = round(subtotalAfterDiscounts * (depositPct / 100));
  const balanceOnArrival = round(subtotalAfterDiscounts * (1 - depositPct / 100) * (1 - cashDiscountPct / 100));
  const totalACobrar = depositAmount + balanceOnArrival;

  const mealAddon = calculateMealAddon(input, totalPeople, input.nights, season.meat_base_price, ivaMultiplier);

  const salonAdjustmentAmount = salon.flatAdjustment;
  const manualAdjustmentAmount = input.manualAdjustment?.amount ?? 0;
  const manualAdjustmentNote = input.manualAdjustment?.note ?? null;

  const total = totalACobrar + mealAddon.total + salonAdjustmentAmount + manualAdjustmentAmount;

  return {
    seasonName: season.name,
    totalPeople,
    nights: input.nights,
    accommodationLines,
    accommodationTotal,
    foodTotal,
    ivaPct,
    salonCostTotal,
    salon,
    capacityWarnings,
    grossBeforeDiscount,
    lodgingOneNightTotal,
    nightsDiscountPct,
    headcountDiscountPct,
    nightsDiscountAmount,
    headcountDiscountAmount,
    liberadosMultiplier,
    liberadosUnitCost,
    liberadosDiscountAmount,
    totalDiscounts,
    subtotalAfterDiscounts,
    depositPct,
    cashDiscountPct,
    depositAmount,
    balanceOnArrival,
    totalACobrar,
    mealAddon,
    salonAdjustmentAmount,
    manualAdjustmentAmount,
    manualAdjustmentNote,
    total,
  };
}
