import type {
  AccommodationRateRow,
  AccommodationTypeRow,
  DiscountTierHeadcountRow,
  DiscountTierNightsRow,
  MealSurchargeTierRow,
  PricingSeasonRow,
  PricingSettingsRow,
  SalonThresholdRow,
} from '@/lib/supabase/types';

export interface PricingConfig {
  seasons: PricingSeasonRow[];
  accommodationTypes: AccommodationTypeRow[];
  accommodationRates: AccommodationRateRow[];
  mealTiers: MealSurchargeTierRow[];
  nightsDiscounts: DiscountTierNightsRow[];
  headcountDiscounts: DiscountTierHeadcountRow[];
  salonThresholds: SalonThresholdRow[];
  settings: PricingSettingsRow;
}

export interface AccommodationMixInput {
  accommodationTypeId: string;
  /** how many units of this specific occupancy configuration (e.g. 2 "cuádruple" cabins) */
  units: number;
}

export interface ManualAdjustment {
  amount: number;
  note: string;
}

export interface QuoteInput {
  retreatStartDate: string; // ISO date, e.g. "2026-10-15"
  nights: number;
  accommodationMix: AccommodationMixInput[];
  /** null = base vegetarian menu, no surcharge */
  mealTierId: string | null;
  /** standalone lunches/dinners beyond the 4 meals/day already included per night */
  extraMealsCount?: number;
  /** staff-entered exception (minimum billable headcount, free facilitator
   * lodging, weekday-only discount, etc.) -- always carries a note explaining why */
  manualAdjustment?: ManualAdjustment | null;
  /** static list of long-weekend start dates (ISO), used only for the Nave 3-night/20-person rule */
  longWeekendDates?: string[];
}

export interface AccommodationMixLine {
  accommodationTypeId: string;
  label: string;
  units: number;
  capacity: number;
  peopleAssigned: number;
  combinedRatePerNight: number;
  /** units * combinedRatePerNight * nights * (1 + ivaPct/100) -- IVA is baked in per line. */
  lineTotal: number;
}

export interface SalonAssignment {
  salonCode: 'nave' | 'nodriza' | null;
  label: string | null;
  warning: string | null;
  flatAdjustment: number;
}

export interface QuoteResult {
  seasonName: string;
  totalPeople: number;
  nights: number;

  /** Already IVA-inclusive (see AccommodationMixLine.lineTotal). */
  accommodationLines: AccommodationMixLine[];
  baseAccommodationTotal: number;
  ivaPct: number;

  /** Salon usage: salon_per_day * nights / totalPeople, added once for each
   * DISTINCT accommodation line with a nonzero quantity -- confirmed via a
   * real side-by-side test against the spreadsheet, an unusual quirk but
   * verified to reproduce the real numbers exactly. */
  salonCostTotal: number;

  salon: SalonAssignment;

  /** accommodation (IVA-inclusive) + salon, before any discount */
  grossBeforeDiscount: number;

  /** Display percentages -- the real combination is MULTIPLICATIVE
   * (sequential), not additive: total multiplier = nightsMult * headcountMult. */
  nightsDiscountPct: number;
  headcountDiscountPct: number;
  discountAmount: number;
  /** grossBeforeDiscount with both discounts applied, before meal add-ons
   * (which are never discounted -- confirmed via the real formula). */
  subtotalAfterDiscounts: number;

  mealTierLabel: string | null;
  mealSurchargeTotal: number;

  extraMealsCount: number;
  extraMealsTotal: number;

  /** subtotalAfterDiscounts + meal add-ons + any salon/manual adjustment --
   * this is the base the final 30/70 payment split applies to. */
  adjustedTotal: number;

  salonAdjustmentAmount: number;
  manualAdjustmentAmount: number;
  manualAdjustmentNote: string | null;

  /** Confirmed real payment structure: deposit_pct paid as seña (no discount),
   * the rest paid in cash on arrival with a cash_discount_pct discount --
   * NOT a 50/50 transfer-vs-cash split. total = depositAmount + balanceOnArrival. */
  depositPct: number;
  cashDiscountPct: number;
  depositAmount: number;
  balanceOnArrival: number;
  total: number;
}
