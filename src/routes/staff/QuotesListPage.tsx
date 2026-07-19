import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import type { QuoteRow } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatARS } from '@/lib/pricing/format';

export function QuotesListPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotes(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Cotizaciones</h1>
        <Link to="/staff/quotes/new" className={buttonVariants()}>
          Nueva cotización
        </Link>
      </div>

      {loading && <p className="text-muted-foreground">Cargando…</p>}
      {!loading && quotes.length === 0 && <p className="text-muted-foreground">Todavía no creaste ninguna cotización.</p>}

      <div className="space-y-3">
        {quotes.map((quote) => (
          <Card key={quote.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {format(new Date(quote.retreat_start_date + 'T00:00:00'), 'dd/MM/yyyy')} · {quote.headcount}{' '}
                personas · {quote.retreat_nights} noches
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Precio cargado: {formatARS(quote.staff_quoted_total)}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/q/${quote.slug}`)}>
                  Copiar link
                </Button>
                <Link to={`/staff/quotes/${quote.id}`} className={buttonVariants({ size: 'sm' })}>
                  Ver
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
