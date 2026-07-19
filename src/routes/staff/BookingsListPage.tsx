import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { BookingRequestRow, BookingStatus } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  released: 'Liberada',
};

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  released: 'outline',
};

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function BookingsListPage() {
  const [bookings, setBookings] = useState<BookingRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('booking_requests')
      .select('*')
      .order('start_date', { ascending: true });
    setBookings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: BookingStatus) {
    await supabase.from('booking_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  function overlappingWith(booking: BookingRequestRow): BookingRequestRow[] {
    return bookings.filter(
      (other) =>
        other.id !== booking.id &&
        other.status !== 'released' &&
        rangesOverlap(booking.start_date, booking.end_date, other.start_date, other.end_date),
    );
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium">Solicitudes de retiro</h1>
      {bookings.length === 0 && <p className="text-muted-foreground">Todavía no hay solicitudes.</p>}
      {bookings.map((booking) => {
        const conflicts = overlappingWith(booking);
        return (
          <Card key={booking.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {format(new Date(booking.start_date + 'T00:00:00'), 'dd/MM/yyyy')} —{' '}
                  {format(new Date(booking.end_date + 'T00:00:00'), 'dd/MM/yyyy')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {booking.organizer_name} · {booking.organizer_email} · {booking.organizer_phone}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Lugar donde opera</dt>
                  <dd>{booking.operating_location}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tipo de retiro</dt>
                  <dd>{booking.retreat_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Participantes est.</dt>
                  <dd>{booking.estimated_participants}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Primera vez facilitando</dt>
                  <dd>{booking.is_first_time_facilitating ? 'Sí' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Conoce el centro</dt>
                  <dd>{booking.familiar_with_center ? 'Sí' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cómo nos encontró</dt>
                  <dd>{booking.referral_source}</dd>
                </div>
              </dl>

              {conflicts.length > 0 && (
                <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  ⚠ Se solapa con {conflicts.length} otra(s) solicitud(es) para fechas similares. Revisar antes de
                  confirmar.
                </p>
              )}

              {booking.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(booking.id, 'confirmed')}>
                    Confirmar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(booking.id, 'released')}>
                    Liberar
                  </Button>
                </div>
              )}
              {booking.status === 'confirmed' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(booking.id, 'released')}>
                  Liberar fechas
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
