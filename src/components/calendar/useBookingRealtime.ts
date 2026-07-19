import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { BookingCalendarEventRow } from '@/lib/supabase/types';

/**
 * Loads the current shared calendar state and stays in sync via Supabase
 * Realtime, so if another visitor submits/confirms/releases a booking while
 * this page is open, availability updates within seconds without a refresh.
 */
export function useBookingRealtime() {
  const [events, setEvents] = useState<BookingCalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('booking_calendar_events')
      .select('*')
      .then(({ data }) => {
        if (!cancelled) {
          setEvents(data ?? []);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel('booking-calendar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_calendar_events' },
        (payload) => {
          setEvents((prev) => {
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as { id: string };
              return prev.filter((e) => e.id !== oldRow.id);
            }
            const newRow = payload.new as BookingCalendarEventRow;
            const withoutOld = prev.filter((e) => e.id !== newRow.id);
            return [...withoutOld, newRow];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, loading };
}
