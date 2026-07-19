import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { AvailabilityCalendar } from '@/components/calendar/AvailabilityCalendar';
import { BookingForm } from '@/components/booking/BookingForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function BookingPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-medium">¡Listo! Recibimos tu solicitud 🌿</h1>
        <p className="mt-3 text-muted-foreground">
          El equipo de Centro Umepay va a revisar la disponibilidad real y te va a contactar para confirmar
          las fechas. Mientras tanto, esas fechas quedan marcadas como pendientes en el calendario.
        </p>
        <Button className="mt-6" onClick={() => setSubmitted(false)}>
          Enviar otra solicitud
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-medium sm:text-3xl">Solicitud de Retiro — Centro Umepay</h1>
        <p className="text-muted-foreground">
          Elegí las fechas que te interesan y contanos sobre tu retiro. Te vamos a contactar para confirmar
          disponibilidad y coordinar los siguientes pasos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>1. Elegí las fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityCalendar selected={dateRange} onSelect={setDateRange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Contanos sobre vos y tu retiro</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm dateRange={dateRange} onSubmitted={() => setSubmitted(true)} />
        </CardContent>
      </Card>
    </div>
  );
}
