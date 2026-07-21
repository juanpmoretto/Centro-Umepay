import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { usePricingConfig } from '@/lib/pricing/usePricingConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SyncLogRow {
  id: string;
  trigger_type: 'manual' | 'cron';
  status: 'success' | 'error';
  error_detail: string | null;
  rows_synced: number | null;
  started_at: string;
  finished_at: string | null;
}

export function PricingSyncPage() {
  const { config, loading } = usePricingConfig();
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  function loadLogs() {
    supabase
      .from('pricing_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setLogs(data ?? []));
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function triggerSync() {
    setSyncing(true);
    setSyncResult(null);
    const { data, error } = await supabase.functions.invoke('sync-pricing', { body: { trigger_type: 'manual' } });
    setSyncing(false);
    setSyncResult(error ? `Error: ${error.message}` : `Sincronizado: ${data?.rowsSynced ?? '?'} filas`);
    loadLogs();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Sincronización de precios</h1>
        <Button onClick={triggerSync} disabled={syncing}>
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora desde Tarifas_App'}
        </Button>
      </div>

      {syncResult && <p className="text-sm">{syncResult}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Config actual</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {loading && 'Cargando…'}
          {config && (
            <ul className="space-y-1">
              <li>{config.seasons.length} temporadas</li>
              <li>{config.accommodationTypes.length} tipos de alojamiento</li>
              <li>{config.accommodationRates.length} tarifas</li>
              <li>{config.liberadosTiers.length} tramos de "liberados"</li>
              <li>IVA: {config.settings.iva_pct}% · Seña: {config.settings.deposit_pct}%</li>
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-medium">Historial de sincronizaciones</h2>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <span>{format(new Date(log.started_at), 'dd/MM/yyyy HH:mm')}</span>{' '}
                <span className="text-muted-foreground">
                  ({log.trigger_type === 'manual' ? 'manual' : 'automática'})
                </span>
                {log.status === 'error' && log.error_detail && (
                  <p className="text-xs text-destructive">{log.error_detail}</p>
                )}
              </div>
              <Badge variant={log.status === 'success' ? 'default' : 'outline'}>
                {log.status === 'success' ? `OK · ${log.rows_synced} filas` : 'Error'}
              </Badge>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay sincronizaciones.</p>}
        </div>
      </div>
    </div>
  );
}
