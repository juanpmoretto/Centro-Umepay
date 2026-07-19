-- Daily automatic pricing sync, in case staff edit the Tarifas_App sheet
-- without remembering to click "Sincronizar ahora" in /staff/pricing.
--
-- IMPORTANT -- manual steps required after this migration runs (these need a
-- live project and real secrets, so they can't be baked into a migration
-- file safely):
--   1. In the Supabase dashboard, store the service role key as a Vault
--      secret named 'service_role_key' (Project Settings -> Vault), or run:
--        select vault.create_secret('<your-service-role-key>', 'service_role_key');
--   2. Replace the placeholder project ref below
--      ('YOUR_PROJECT_REF') with the real one.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-pricing-daily',
  '0 8 * * *', -- 05:00 ART (UTC-3) once a year-round approximation is fine for a daily safety-net sync
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-pricing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('trigger_type', 'cron')
  );
  $$
);
