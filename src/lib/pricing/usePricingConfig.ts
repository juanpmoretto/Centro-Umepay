import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { PricingConfig } from './types';

interface UsePricingConfigResult {
  config: PricingConfig | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the full pricing config once and keeps it in memory for the session.
 * All of these tables are small (tens of rows) and public-readable, so a
 * single fetch on mount is enough -- no need for React Query/caching layers.
 */
export function usePricingConfig(): UsePricingConfigResult {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [seasons, accommodationTypes, accommodationRates, mealTiers, nightsDiscounts, headcountDiscounts, salonThresholds, settings] =
        await Promise.all([
          supabase.from('pricing_seasons').select('*').order('sort_order'),
          supabase.from('accommodation_types').select('*').order('sort_order'),
          supabase.from('accommodation_rates').select('*'),
          supabase.from('meal_surcharge_tiers').select('*').order('sort_order'),
          supabase.from('discount_tiers_nights').select('*').order('min_nights'),
          supabase.from('discount_tiers_headcount').select('*').order('min_people'),
          supabase.from('salon_thresholds').select('*'),
          supabase.from('pricing_settings').select('*').single(),
        ]);

      if (cancelled) return;

      const firstError =
        seasons.error ||
        accommodationTypes.error ||
        accommodationRates.error ||
        mealTiers.error ||
        nightsDiscounts.error ||
        headcountDiscounts.error ||
        salonThresholds.error ||
        settings.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setConfig({
        seasons: seasons.data ?? [],
        accommodationTypes: accommodationTypes.data ?? [],
        accommodationRates: accommodationRates.data ?? [],
        mealTiers: mealTiers.data ?? [],
        nightsDiscounts: nightsDiscounts.data ?? [],
        headcountDiscounts: headcountDiscounts.data ?? [],
        salonThresholds: salonThresholds.data ?? [],
        settings: settings.data!,
      });
      setLoading(false);
    }

    load().catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : 'Error cargando la configuración de precios');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}
