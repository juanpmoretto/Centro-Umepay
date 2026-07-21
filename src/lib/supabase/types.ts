// Hand-written to match supabase/migrations/*.sql. Once the project is linked
// to a live Supabase instance, prefer regenerating this with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type BookingStatus = 'pending' | 'confirmed' | 'released';
export type EstimatedParticipants = '10-12' | '16-20' | '20-30' | '30+';
export type BathroomType = 'interior' | 'exterior';
export type AccommodationCategory = 'trailer' | 'cabin_interior' | 'cabin_exterior' | 'carpa';
export type MealPlan = 'lunch_only' | 'lunch_dinner' | 'full_board';
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
  /** Charged every night, for the whole group (not per person). Already IVA-inclusive. */
  salon_per_day: number;
  /** Base food cost for ONE person for ONE night, no IVA -- a unit's food
   * cost = this * capacity (see AccommodationTypeRow.max_capacity). */
  food_price_per_person_per_night: number;
  /** Base price used to derive the 200g/400g carne addon unit prices (see calculateQuote). */
  meat_base_price: number;
  sort_order: number;
  synced_at: string;
}

export interface AccommodationTypeRow {
  id: string;
  code: string;
  label: string;
  min_capacity: number;
  max_capacity: number;
  /** Physical units of this SPECIFIC config -- informational only. The real
   * cap is shared across the whole category (see AccommodationCategory). */
  total_units: number;
  bathroom_type: BathroomType;
  category: AccommodationCategory;
  sort_order: number;
}

export interface AccommodationRateRow {
  id: string;
  season_id: string;
  accommodation_type_id: string;
  /** Lodging only, no IVA, no food -- per unit per night. */
  lodging_rate_per_night: number;
  synced_at: string;
}

export interface DiscountTierNightsRow {
  id: string;
  season_id: string;
  min_nights: number;
  max_nights: number | null;
  discount_pct: number;
}

export interface DiscountTierHeadcountRow {
  id: string;
  min_people: number;
  discount_pct: number;
}

export interface LiberadosTierRow {
  id: string;
  min_people: number;
  max_people: number | null;
  /** How many "trailer x1" line-equivalents get subtracted as a bonification. */
  multiplier: number;
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
  /** Applied per accommodation/food line (amount * (1 + iva_pct/100)), not as a separate final step. */
  iva_pct: number;
  /** Both the seña fraction AND the "paid up front" share of the final 30/70 payment split. */
  deposit_pct: number;
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
  /** null = pure vegetarian, no carne plan chosen */
  meal_plan: MealPlan | null;
  meat_200g_count: number;
  meat_400g_count: number;
  /** Manual override for case-by-case exceptions not covered by the formula
   * (e.g. a negotiated extra discount) -- see manual_adjustment_note. */
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
  adjusted_meal_plan: MealPlan | null;
  adjusted_meat_200g_count: number;
  adjusted_meat_400g_count: number;
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
