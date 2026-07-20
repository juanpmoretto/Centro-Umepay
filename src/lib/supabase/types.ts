// Hand-written to match supabase/migrations/*.sql. Once the project is linked
// to a live Supabase instance, prefer regenerating this with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type BookingStatus = 'pending' | 'confirmed' | 'released';
export type EstimatedParticipants = '10-12' | '16-20' | '20-30' | '30+';
export type BathroomType = 'interior' | 'exterior';
export type ProteinTier = 'item_200g' | 'premium_400g';
export type QuoteInquiryStatus = 'new' | 'reviewed';

export interface BookingRequestRow {
  id: string;
  start_date: string;
  end_date: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  operating_location: string;
  is_first_time_facilitating: boolean;
  retreat_type: string;
  profession: string;
  estimated_participants: EstimatedParticipants;
  familiar_with_center: boolean;
  referral_source: string;
  status: BookingStatus;
  staff_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type BookingRequestInsert = Omit<
  BookingRequestRow,
  'id' | 'status' | 'staff_note' | 'reviewed_by' | 'reviewed_at' | 'created_at'
>;

export interface BookingCalendarEventRow {
  id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
}

export interface PricingSeasonRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  /** Charged every night, for the whole group (not per person). Varies by
   * season since Centro Umepay re-prices roughly every two months. */
  salon_per_day: number;
  sort_order: number;
  synced_at: string;
}

export interface AccommodationTypeRow {
  id: string;
  code: string;
  label: string;
  min_capacity: number;
  max_capacity: number;
  total_units: number;
  bathroom_type: BathroomType;
  sort_order: number;
}

export interface AccommodationRateRow {
  id: string;
  season_id: string;
  accommodation_type_id: string;
  /** Total per-night rate for the whole unit at its fixed occupancy
   * (see AccommodationTypeRow.max_capacity) -- already includes that
   * configuration's base vegetarian food. Not a per-person rate. */
  combined_rate_per_night: number;
  synced_at: string;
}

export interface MealSurchargeTierRow {
  id: string;
  code: string;
  label: string;
  protein_tier: ProteinTier;
  surcharge_per_person_total: number;
  sort_order: number;
}

export interface DiscountTierNightsRow {
  id: string;
  min_nights: number;
  max_nights: number | null;
  discount_pct: number;
}

export interface DiscountTierHeadcountRow {
  id: string;
  min_people: number;
  discount_pct: number;
}

export interface SalonThresholdRow {
  id: string;
  salon_code: 'nave' | 'nodriza';
  label: string;
  min_people: number;
  max_people: number | null;
  long_weekend_min_nights: number | null;
  long_weekend_min_people: number | null;
  flat_adjustment: number;
}

export interface PricingSettingsRow {
  id: true;
  /** Applied per accommodation line (units * rate * nights * (1 + iva_pct/100)), not as a separate final step. */
  iva_pct: number;
  /** Both the seña fraction AND the "paid up front" share of the final 30/70 payment split. */
  deposit_pct: number;
  extra_meal_price: number;
  /** Discount on the remaining (100-deposit_pct)% paid in cash on arrival. */
  cash_discount_pct: number;
  synced_at: string;
}

export interface AccommodationMixEntry {
  accommodation_type_id: string;
  units: number;
  people_assigned: number;
}

export interface QuoteRow {
  id: string;
  slug: string;
  created_by: string;
  retreat_start_date: string;
  retreat_nights: number;
  headcount: number;
  accommodation_mix: AccommodationMixEntry[];
  meal_tier_id: string | null;
  extra_meals_count: number;
  /** Manual override for case-by-case exceptions (minimum billable headcount,
   * free facilitator lodging, weekday-only discounts) -- see manual_adjustment_note. */
  manual_adjustment_amount: number;
  manual_adjustment_note: string | null;
  calculated_total: number;
  staff_note: string | null;
  booking_request_id: string | null;
  created_at: string;
  expires_at: string | null;
}

export type QuoteInsert = Omit<QuoteRow, 'id' | 'created_at'>;

export interface QuoteInquiryRow {
  id: string;
  quote_id: string;
  adjusted_nights: number;
  adjusted_headcount: number;
  adjusted_accommodation_mix: AccommodationMixEntry[];
  adjusted_meal_tier_id: string | null;
  adjusted_extra_meals_count: number;
  estimated_total: number;
  client_message: string | null;
  status: QuoteInquiryStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type QuoteInquiryInsert = Omit<
  QuoteInquiryRow,
  'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'created_at'
>;
