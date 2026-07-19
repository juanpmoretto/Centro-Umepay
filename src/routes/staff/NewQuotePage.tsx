import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { usePricingConfig } from '@/lib/pricing/usePricingConfig';
import { calculateQuote } from '@/lib/pricing/calculateQuote';
import type { AccommodationMixInput, QuoteResult } from '@/lib/pricing/types';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccommodationMixEditor } from '@/components/quote/AccommodationMixEditor';
import { QuoteBreakdown } from '@/components/quote/QuoteBreakdown';

export function NewQuotePage() {
  const { config, loading, error } = usePricingConfig();
  const navigate = useNavigate();

  const [retreatStartDate, setRetreatStartDate] = useState('');
  const [nights, setNights] = useState(3);
  const [mix, setMix] = useState<AccommodationMixInput[]>([]);
  const [mealTierId, setMealTierId] = useState<string | null>(null);
  const [staffQuotedTotal, setStaffQuotedTotal] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  if (loading) return <p className="text-muted-foreground">Cargando configuración de precios…</p>;
  if (error || !config) return <p className="text-destructive">Error cargando precios: {error}</p>;

  let previewError: string | null = null;
  let preview: QuoteResult | null = null;
  if (retreatStartDate && mix.length > 0) {
    try {
      preview = calculateQuote({ retreatStartDate, nights, accommodationMix: mix, mealTierId }, config);
    } catch (e) {
      previewError = e instanceof Error ? e.message : 'Error calculando el estimado';
    }
  }

  async function handleCreate() {
    setSaving(true);
    setSaveError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaveError('Sesión inválida, volvé a iniciar sesión.');
      setSaving(false);
      return;
    }

    const slug = nanoid(12);
    const { error } = await supabase.from('quotes').insert({
      slug,
      created_by: userData.user.id,
      retreat_start_date: retreatStartDate,
      retreat_nights: nights,
      headcount: mix.reduce((sum, m) => sum + m.peopleAssigned, 0),
      accommodation_mix: mix.map((m) => ({
        accommodation_type_id: m.accommodationTypeId,
        units: 1,
        people_assigned: m.peopleAssigned,
      })),
      meal_tier_id: mealTierId,
      staff_quoted_total: Number(staffQuotedTotal),
      staff_note: staffNote || null,
      booking_request_id: null,
      expires_at: null,
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setShareLink(`${window.location.origin}/q/${slug}`);
  }

  if (shareLink) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-medium">Cotización creada</h1>
        <p className="text-muted-foreground">Compartí este link con el cliente:</p>
        <Input readOnly value={shareLink} onFocus={(e) => e.currentTarget.select()} />
        <div className="flex gap-2">
          <Button onClick={() => navigator.clipboard.writeText(shareLink)}>Copiar link</Button>
          <Button variant="outline" onClick={() => navigate('/staff/quotes')}>
            Ver todas las cotizaciones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Nueva cotización</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="retreatStartDate">Fecha del retiro</Label>
            <Input
              id="retreatStartDate"
              type="date"
              value={retreatStartDate}
              onChange={(e) => setRetreatStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nights">Cantidad de noches</Label>
            <Input id="nights" type="number" min={1} value={nights} onChange={(e) => setNights(Number(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label>Alojamiento</Label>
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
            <Label htmlFor="staffQuotedTotal">Precio ya calculado por el equipo (ARS)</Label>
            <Input
              id="staffQuotedTotal"
              type="number"
              min={0}
              value={staffQuotedTotal}
              onChange={(e) => setStaffQuotedTotal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staffNote">Nota interna (opcional)</Label>
            <Textarea id="staffNote" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} />
          </div>
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          <Button
            className="w-full"
            disabled={saving || !retreatStartDate || mix.length === 0 || !staffQuotedTotal}
            onClick={handleCreate}
          >
            {saving ? 'Creando…' : 'Crear cotización y generar link'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista previa del estimado (nuestra fórmula)</CardTitle>
        </CardHeader>
        <CardContent>
          {previewError && <p className="text-destructive text-sm">{previewError}</p>}
          {!preview && !previewError && (
            <p className="text-sm text-muted-foreground">
              Completá fecha y alojamiento para ver el estimado calculado por la app.
            </p>
          )}
          {preview && <QuoteBreakdown result={preview} />}
        </CardContent>
      </Card>
    </div>
  );
}
