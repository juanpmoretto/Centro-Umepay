import type {
  AccommodationRateRow,
  AccommodationTypeRow,
  DiscountTierHeadcountRow,
  DiscountTierNightsRow,
  LiberadosTierRow,
  MealPlan,
  PricingSeasonRow,
  PricingSettingsRow,
  SalonThresholdRow,
} from '@/lib/supabase/types';

export interface PricingConfig {
  seasons: PricingSeasonRow[];
  accommodationTypes: AccommodationTypeRow[];
  accommodationRates: AccommodationRateRow[];
  nightsDiscounts: DiscountTierNightsRow[];
  headcountDiscounts: DiscountTierHeadcountRow[];
  liberadosTiers: LiberadosTierRow[];
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
  /** null = pure vegetarian, no carne plan */
  mealPlan: MealPlan | null;
  /** how many of the total headcount add the 200g carne option (only meaningful if mealPlan is set) */
  meat200gCount?: number;
  /** how many of the total headcount add the 400g premium carne option */
  meat400gCount?: number;
  /** staff-entered exception not covered by the formula -- always carries a note explaining why */
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
  lodgingRatePerNight: number;
  /** units * lodgingRatePerNight * nights * (1 + ivaPct/100) */
  lodgingLineTotal: number;
  /** units * (foodPricePerPerson * capacity) * nights * (1 + ivaPct/100) */
  foodLineTotal: number;
  /** units * lodgingRatePerNight * (1 + ivaPct/100) -- ONE night, lodging only.
   * This is the basis the nights/headcount discounts are computed on. */
  lodgingOneNight: number;
}

export interface CapacityWarning {
  category: string;
  used: number;
  max: number;
}

export interface SalonAssignment {
  salonCode: 'nave' | 'nodriza' | null;
  label: string | null;
  warning: string | null;
  flatAdjustment: number;
}

export interface MealAddonBreakdown {
  plan: MealPlan | null;
  meat200gCount: number;
  meat400gCount: number;
  unitPrice200g: number;
  unitPrice400g: number;
  total: number;
}

export interface QuoteResult {
  seasonName: string;
  totalPeople: number;
  nights: number;

  accommodationLines: AccommodationMixLine[];
  /** sum of lodgingLineTotal across lines (all nights, IVA-inclusive) */
  accommodationTotal: number;
  /** sum of foodLineTotal across lines (all nights, IVA-inclusive) */
  foodTotal: number;
  ivaPct: number;

  /** Salon usage: salon_per_day * nights / totalPeople, added once for each
   * DISTINCT accommodation line with a nonzero quantity (confirmed real quirk). */
  salonCostTotal: number;

  salon: SalonAssignment;
  capacityWarnings: CapacityWarning[];

  /** accommodationTotal + foodTotal + salonCostTotal, before any discount */
  grossBeforeDiscount: number;

  /** Both discounts are computed on ONE NIGHT of lodging-only cost (not the
   * multi-night, food-inclusive gross) -- confirmed real (if unintuitive) rule. */
  lodgingOneNightTotal: number;
  nightsDiscountPct: number;
  headcountDiscountPct: number;
  nightsDiscountAmount: number;
  headcountDiscountAmount: number;

  /** How many "liberados" trailer-equivalents apply (0, 1, 2 or 3). */
  liberadosMultiplier: number;
  /** Cost of one liberados unit (trailer x1 lodging+IVA*nights + its own salon share). */
  liberadosUnitCost: number;
  /** Subtracted from the total as a bonification for large groups. */
  liberadosDiscountAmount: number;

  totalDiscounts: number;
  /** grossBeforeDiscount - totalDiscounts ("Total con descuentos incluidos") */
  subtotalAfterDiscounts: number;

  salonAdjustmentAmount: number;
  manualAdjustmentAmount: number;
  manualAdjustmentNote: string | null;

  /** subtotalAfterDiscounts + salonAdjustmentAmount + manualAdjustmentAmount --
   * these adjustments apply BEFORE the seña/saldo split so the cash discount
   * on the saldo also applies proportionally to them (matches the master Excel). */
  baseFinal: number;

  depositPct: number;
  cashDiscountPct: number;
  depositAmount: number;
  balanceOnArrival: number;
  /** depositAmount + balanceOnArrival ("TOTAL A COBRAR") */
  totalACobrar: number;

  mealAddon: MealAddonBreakdown;

  /** totalACobrar + mealAddon.total */
  total: number;
}
