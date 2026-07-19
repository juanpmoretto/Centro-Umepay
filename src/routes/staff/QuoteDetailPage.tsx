import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import type { QuoteInquiryRow, QuoteRow } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatARS } from '@/lib/pricing/format';

export function QuoteDetailPage() {
  const { id } = useParams();
  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [inquiries, setInquiries] = useState<QuoteInquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('quotes').select('*').eq('id', id).single(),
      supabase.from('quote_inquiries').select('*').eq('quote_id', id).order('created_at', { ascending: false }),
    ]).then(([quoteRes, inquiriesRes]) => {
      setQuote(quoteRes.data ?? null);
      setInquiries(inquiriesRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  async function markReviewed(inquiryId: string) {
    await supabase
      .from('quote_inquiries')
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
      .eq('id', inquiryId);
    setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, status: 'reviewed' } : i)));
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!quote) return <p className="text-destructive">No se encontró la cotización.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Cotización base — {format(new Date(quote.retreat_start_date + 'T00:00:00'), 'dd/MM/yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Personas: {quote.headcount}</p>
          <p>Noches: {quote.retreat_nights}</p>
          <p>Precio cargado por el equipo: {formatARS(quote.staff_quoted_total)}</p>
          {quote.staff_note && <p className="text-muted-foreground">Nota: {quote.staff_note}</p>}
          <p className="text-muted-foreground">Link: {window.location.origin}/q/{quote.slug}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-medium">Consultas del cliente ({inquiries.length})</h2>
        {inquiries.length === 0 && (
          <p className="text-sm text-muted-foreground">El cliente todavía no envió ninguna variante ajustada.</p>
        )}
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {inquiry.adjusted_headcount} personas · {inquiry.adjusted_nights} noches
                </CardTitle>
                <Badge variant={inquiry.status === 'new' ? 'default' : 'outline'}>
                  {inquiry.status === 'new' ? 'Nueva' : 'Revisada'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Estimado del cliente: {formatARS(inquiry.estimated_total)}</p>
                {inquiry.client_message && <p className="text-muted-foreground">"{inquiry.client_message}"</p>}
                {inquiry.status === 'new' && (
                  <Button size="sm" variant="outline" onClick={() => markReviewed(inquiry.id)}>
                    Marcar como revisada
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
