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

  accommodationLines: AccommodationMixLine[];
  baseAccommodationTotal: number;

  /** Salon usage, charged every night for the whole group (not per person). */
  salonCostTotal: number;
  /** "Apoyo difusión y logística", a single fixed fee for the whole stay (not per night). */
  logisticsCostTotal: number;

  salon: SalonAssignment;

  /** accommodation + salon + logistics, before any discount */
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

  /** subtotalAfterDiscounts + meal add-ons, the base the IVA split applies to */
  cashTotalWithAddons: number;

  ivaPct: number;
  ivaAmount: number;

  salonAdjustmentAmount: number;
  manualAdjustmentAmount: number;
  manualAdjustmentNote: string | null;

  total: number;

  depositPct: number;
  depositAmount: number;
  balanceOnArrival: number;
}
