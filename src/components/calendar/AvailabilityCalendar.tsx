import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { useBookingRealtime } from './useBookingRealtime';

interface AvailabilityCalendarProps {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}

function eachDateInRange(startIso: string, endIso: string): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(startIso + 'T00:00:00');
  const end = new Date(endIso + 'T00:00:00');
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function AvailabilityCalendar({ selected, onSelect }: AvailabilityCalendarProps) {
  const { events, loading } = useBookingRealtime();

  const { confirmedDates, pendingDates } = useMemo(() => {
    const confirmed: Date[] = [];
    const pending: Date[] = [];
    for (const event of events) {
      const dates = eachDateInRange(event.start_date, event.end_date);
      if (event.status === 'confirmed') confirmed.push(...dates);
      else if (event.status === 'pending') pending.push(...dates);
    }
    return { confirmedDates: confirmed, pendingDates: pending };
  }, [events]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-3">
      <Calendar
        mode="range"
        numberOfMonths={2}
        selected={selected}
        onSelect={onSelect}
        disabled={[{ before: today }, ...confirmedDates]}
        modifiers={{ pending: pendingDates, confirmed: confirmedDates }}
        modifiersClassNames={{
          pending: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
          confirmed: 'bg-destructive/20 text-destructive line-through',
        }}
      />
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-amber-100 dark:bg-amber-950" /> Solicitado (pendiente de
          confirmación)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-destructive/20" /> Confirmado (no disponible)
        </span>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Cargando disponibilidad…</p>}
    </div>
  );
}
