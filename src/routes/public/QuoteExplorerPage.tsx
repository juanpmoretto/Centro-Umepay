import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import type { QuoteRow } from '@/lib/supabase/types';
import { usePricingConfig } from '@/lib/pricing/usePricingConfig';
import { calculateQuote } from '@/lib/pricing/calculateQuote';
import type { AccommodationMixInput, QuoteResult } from '@/lib/pricing/types';
import { formatARS } from '@/lib/pricing/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccommodationMixEditor } from '@/components/quote/AccommodationMixEditor';
import { QuoteBreakdown } from '@/components/quote/QuoteBreakdown';

export function QuoteExplorerPage() {
  const { slug } = useParams();
  const { config, loading: configLoading, error: configError } = usePricingConfig();

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [nights, setNights] = useState(0);
  const [mix, setMix] = useState<AccommodationMixInput[]>([]);
  const [mealTierId, setMealTierId] = useState<string | null>(null);
  const [extraMealsCount, setExtraMealsCount] = useState(0);
  const [clientMessage, setClientMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .rpc('get_quote_by_slug', { p_slug: slug })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) {
          setNotFound(true);
          setQuoteLoading(false);
          return;
        }
        setQuote(row);
        setNights(row.retreat_nights);
        setMix(
          row.accommodation_mix.map((m: { accommodation_type_id: string; people_assigned: number }) => ({
            accommodationTypeId: m.accommodation_type_id,
            peopleAssigned: m.people_assigned,
          })),
        );
        setMealTierId(row.meal_tier_id);
        setExtraMealsCount(row.extra_meals_count);
        setQuoteLoading(false);
      });
  }, [slug]);

  if (quoteLoading || configLoading) return <p className="p-8 text-muted-foreground">Cargando cotización…</p>;
  if (notFound) return <p className="p-8 text-destructive">No encontramos esta cotización. Revisá el link.</p>;
  if (configError || !config || !quote) return <p className="p-8 text-destructive">Error cargando la cotización.</p>;

  let result: QuoteResult | null = null;
  let calcError: string | null = null;
  try {
    result = calculateQuote(
      {
        retreatStartDate: quote.retreat_start_date,
        nights,
        accommodationMix: mix,
        mealTierId,
        extraMealsCount,
        // The manual adjustment is a staff-decided exception tied to this
        // specific negotiated quote (e.g. a minimum-headcount clause) -- the
        // client can explore everything else, but this stays fixed and is
        // just shown transparently in the breakdown below.
        manualAdjustment:
          quote.manual_adjustment_amount !== 0
            ? { amount: quote.manual_adjustment_amount, note: quote.manual_adjustment_note ?? '' }
            : null,
      },
      config,
    );
  } catch (e) {
    calcError = e instanceof Error ? e.message : 'Error calculando el estimado';
  }

  async function sendInquiry() {
    if (!result || !quote) return;
    setSending(true);
    await supabase.from('quote_inquiries').insert({
      quote_id: quote.id,
      adjusted_nights: nights,
      adjusted_headcount: result.totalPeople,
      adjusted_accommodation_mix: mix.map((m) => ({
        accommodation_type_id: m.accommodationTypeId,
        units: 1,
        people_assigned: m.peopleAssigned,
      })),
      adjusted_meal_tier_id: mealTierId,
      adjusted_extra_meals_count: extraMealsCount,
      estimated_total: result.total,
      client_message: clientMessage || null,
    });
    setSending(false);
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-medium">Tu cotización — Centro Umepay</h1>
        <p className="text-muted-foreground">
          Retiro del {format(new Date(quote.retreat_start_date + 'T00:00:00'), 'dd/MM/yyyy')}. Precio original
          cotizado por el equipo: <strong>{formatARS(quote.calculated_total)}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Podés ajustar personas, alojamiento, comida y noches abajo para explorar variantes.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ajustá tu retiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nights">Cantidad de noches</Label>
              <Input id="nights" type="number" min={1} value={nights} onChange={(e) => setNights(Number(e.target.value) || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alojamiento y personas</Label>
              <AccommodationMixEditor accommodationTypes={config.accommodationTypes} value={mix} onChange={setMix} />
            </div>
            <div className="space-y-1.5">
              <Label>Alimentación</Label>
              <Select
                value={mealTierId ?? 'none'}
                onValueChange={(v) => setMealTierId(v === 'none' ? null : v)}
                items={{
                  none: 'Vegetariano (base, sin adicional)',
                  ...Object.fromEntries(config.mealTiers.map((t) => [t.id, t.label])),
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Vegetariano (base, sin adicional)</SelectItem>
                  {config.mealTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="extraMealsCount">Comidas sueltas extra (almuerzo o cena de más)</Label>
              <Input
                id="extraMealsCount"
                type="number"
                min={0}
                value={extraMealsCount}
                onChange={(e) => setExtraMealsCount(Number(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimado en vivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {calcError && <p className="text-sm text-destructive">{calcError}</p>}
            {result && <QuoteBreakdown result={result} />}

            {!sent ? (
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="clientMessage">Mensaje opcional para el equipo</Label>
                <Textarea
                  id="clientMessage"
                  value={clientMessage}
                  onChange={(e) => setClientMessage(e.target.value)}
                  placeholder="Ej: nos interesa esta variante, ¿hay disponibilidad?"
                />
                <Button className="w-full" disabled={sending || !result} onClick={sendInquiry}>
                  {sending ? 'Enviando…' : 'Enviar esta variante al equipo'}
                </Button>
              </div>
            ) : (
              <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                ¡Listo! Le avisamos al equipo de Umepay sobre esta variante.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
