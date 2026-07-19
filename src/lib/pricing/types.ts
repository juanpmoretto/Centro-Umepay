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
  peopleAssigned: number;
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
  peopleAssigned: number;
  pricePerPersonPerNight: number;
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

  salon: SalonAssignment;

  mealTierLabel: string | null;
  mealSurchargeTotal: number;

  extraMealsCount: number;
  extraMealsTotal: number;

  subtotalBeforeDiscounts: number;

  nightsDiscountPct: number;
  headcountDiscountPct: number;
  totalDiscountPct: number;
  discountAmount: number;
  subtotalAfterDiscounts: number;

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
