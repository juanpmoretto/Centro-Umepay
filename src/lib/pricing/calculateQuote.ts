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
      return { salonCode: 'nave', label: nave.label, warning: null };
    }
  }

  if (nodriza) {
    const withinRange =
      totalPeople >= nodriza.min_people && (nodriza.max_people == null || totalPeople <= nodriza.max_people);
    if (withinRange) {
      return { salonCode: 'nodriza', label: nodriza.label, warning: null };
    }
  }

  return {
    salonCode: null,
    label: null,
    warning:
      'La cantidad de personas queda fuera de los rangos estándar de salón (Nave/Nodriza). Confirmar disponibilidad con el equipo de Umepay.',
  };
}

function nightsDiscountFor(config: PricingConfig, nights: number): number {
  const tier = config.nightsDiscounts.find(
    (t) => nights >= t.min_nights && (t.max_nights == null || nights <= t.max_nights),
  );
  return tier?.discount_pct ?? 0;
}

function headcountDiscountFor(config: PricingConfig, totalPeople: number): number {
  const qualifying = config.headcountDiscounts.filter((t) => totalPeople > t.min_people);
  if (qualifying.length === 0) return 0;
  return Math.max(...qualifying.map((t) => t.discount_pct));
}

/**
 * Pure, side-effect-free quote calculator. Mirrors the business rules
 * reverse-engineered from the Centro Umepay master spreadsheet (see the
 * project plan for the full derivation), simplified for client-facing
 * "what-if" exploration rather than exact replication of every seasonal
 * exception in the original sheet.
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
    const lineTotal = entry.peopleAssigned * rate.price_per_person_per_night * input.nights;
    return {
      accommodationTypeId: accType.id,
      label: accType.label,
      peopleAssigned: entry.peopleAssigned,
      pricePerPersonPerNight: rate.price_per_person_per_night,
      lineTotal: round(lineTotal),
    };
  });

  const baseAccommodationTotal = round(accommodationLines.reduce((sum, l) => sum + l.lineTotal, 0));
  const totalPeople = input.accommodationMix.reduce((sum, e) => sum + e.peopleAssigned, 0);

  const salon = assignSalon(
    config,
    totalPeople,
    input.nights,
    input.retreatStartDate,
    input.longWeekendDates ?? [],
  );

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

  const subtotalBeforeDiscounts = round(baseAccommodationTotal + mealSurchargeTotal);

  const nightsDiscountPct = nightsDiscountFor(config, input.nights);
  const headcountDiscountPct = headcountDiscountFor(config, totalPeople);
  const totalDiscountPct = nightsDiscountPct + headcountDiscountPct;

  const discountAmount = round(subtotalBeforeDiscounts * (totalDiscountPct / 100));
  const subtotalAfterDiscounts = subtotalBeforeDiscounts - discountAmount;

  // Standard payment condition: 50% by bank transfer (with IVA) + 50% cash
  // (without IVA). Confirmed against a real Umepay quote example (21% IVA on
  // exactly 50% of the subtotal reproduces the real transfer-vs-cash totals),
  // so this is fixed, not a client-facing toggle.
  const ivaPct = config.settings.iva_pct;
  const ivaAmount = round(subtotalAfterDiscounts * 0.5 * (ivaPct / 100));
  const total = subtotalAfterDiscounts + ivaAmount;

  const depositPct = config.settings.deposit_pct;
  const depositAmount = round(total * (depositPct / 100));
  const balanceOnArrival = total - depositAmount;

  return {
    seasonName: season.name,
    totalPeople,
    nights: input.nights,
    accommodationLines,
    baseAccommodationTotal,
    salon,
    mealTierLabel,
    mealSurchargeTotal,
    subtotalBeforeDiscounts,
    nightsDiscountPct,
    headcountDiscountPct,
    totalDiscountPct,
    discountAmount,
    subtotalAfterDiscounts,
    ivaPct,
    ivaAmount,
    total,
    depositPct,
    depositAmount,
    balanceOnArrival,
  };
}
