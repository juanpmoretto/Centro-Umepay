import { createClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from './googleAuth.ts';
import { parsePricingSheet, SheetValidationError, type SheetGrid } from './parseSheet.ts';

const SHEET_TAB_NAME = 'Tarifas_App';

interface SyncRequestBody {
  trigger_type?: 'manual' | 'cron';
}

async function fetchSheetGrid(sheetId: string, accessToken: string): Promise<SheetGrid> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    SHEET_TAB_NAME,
  )}!A:Z?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`No se pudo leer la pestaña "${SHEET_TAB_NAME}" (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { values?: unknown[][] };
  const values = json.values ?? [];
  return values.map((row) => row.map((cell) => String(cell ?? '')));
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  let body: SyncRequestBody = {};
  try {
    body = await req.json();
  } catch {
    // no body / not JSON -- treat as a cron-triggered run
  }
  const triggerType = body.trigger_type ?? 'cron';

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const sheetId = Deno.env.get('GOOGLE_SHEET_ID');
  const serviceAccountEmail = Deno.env.get('GOOGLE_SA_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SA_PRIVATE_KEY');

  if (!supabaseUrl || !serviceRoleKey || !sheetId || !serviceAccountEmail || !privateKey) {
    return new Response(
      JSON.stringify({
        error:
          'Faltan variables de entorno (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_SHEET_ID, GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY). Configuralas con `supabase secrets set`.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Caller's user id (if invoked by a logged-in staff member from the UI, not
  // via cron) -- best-effort, only used for the sync log's audit trail.
  let triggeredBy: string | null = null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader && triggerType === 'manual') {
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabase.auth.getUser(token);
    triggeredBy = data.user?.id ?? null;
  }

  async function logResult(status: 'success' | 'error', rowsSynced: number | null, errorDetail: string | null) {
    await supabase.from('pricing_sync_log').insert({
      triggered_by: triggeredBy,
      trigger_type: triggerType,
      status,
      error_detail: errorDetail,
      rows_synced: rowsSynced,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
  }

  try {
    const accessToken = await getGoogleAccessToken(serviceAccountEmail, privateKey);
    const grid = await fetchSheetGrid(sheetId, accessToken);
    const parsed = parsePricingSheet(grid);

    const { data: rowsSynced, error } = await supabase.rpc('sync_pricing_config', { payload: parsed });
    if (error) throw new Error(error.message);

    await logResult('success', rowsSynced as number, null);
    return new Response(JSON.stringify({ ok: true, rowsSynced }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Deliberately: no writes to pricing tables happen above this point on
    // failure (parsing/validation always runs before the single RPC call,
    // and that RPC call is itself all-or-nothing) -- the app keeps serving
    // the last successfully synced config.
    const message = error instanceof Error ? error.message : String(error);
    const isValidationError = error instanceof SheetValidationError;
    await logResult('error', null, message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: isValidationError ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
