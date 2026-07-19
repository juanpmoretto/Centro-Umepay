# Centro Umepay — Reservas y cotizador

Web app (Vite + React + TypeScript + Supabase) que reemplaza el Google Form de
solicitud de retiros y ofrece un cotizador interactivo para clientes. Ver el
plan completo en `supabase/migrations/` (esquema) y `src/lib/pricing/` (lógica
de cálculo).

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar con las credenciales de tu proyecto Supabase
npm run dev
npm run test            # tests del cotizador (calculateQuote)
npm run build
```

## Poner en marcha un proyecto Supabase real

1. Creá un proyecto en https://supabase.com/dashboard.
2. Copiá la URL del proyecto y la `anon key` (Project Settings → API) a tu `.env`.
3. Corré las migraciones en orden contra ese proyecto (Supabase CLI o pegando
   cada archivo de `supabase/migrations/` en el SQL Editor del dashboard, en
   orden numérico: `0001` a `0008`).
4. (Opcional, para probar el cotizador antes de tener el sync de Sheets
   andando) corré `supabase/seed.sql` — son precios de ejemplo, **no** los
   precios reales de Centro Umepay.
5. Creá al menos un usuario de staff desde el dashboard (Authentication →
   Users → Add user) para poder entrar a `/staff/login`.

## Sincronización de precios desde Google Sheets (Fase 3)

1. En Google Cloud Console: creá un proyecto, habilitá la Sheets API, creá una
   service account y generá su clave JSON.
2. Compartí la planilla madre con el email de la service account
   (`...@...iam.gserviceaccount.com`) como **Lector**.
3. Agregá una pestaña nueva llamada `Tarifas_App` a esa planilla, con el
   layout de `supabase/functions/sync-pricing/tarifas_app_template.csv`
   (secciones marcadas con `### NOMBRE_SECCION`).
4. Configurá los secrets de la Edge Function:
   ```bash
   supabase secrets set GOOGLE_SHEET_ID=<id de la planilla>
   supabase secrets set GOOGLE_SA_EMAIL=<email de la service account>
   supabase secrets set GOOGLE_SA_PRIVATE_KEY="<private_key del JSON, con los \n literales>"
   supabase functions deploy sync-pricing
   ```
5. Desde `/staff/pricing`, botón "Sincronizar ahora" dispara la primera sync.
   Si algo en la pestaña no valida, el error se muestra ahí mismo y los
   precios existentes no se tocan.
6. Para la sincronización automática diaria, ver las instrucciones dentro de
   `supabase/migrations/0008_pricing_sync_cron.sql` (requiere guardar la
   service role key en Supabase Vault y reemplazar el project ref).

## Deploy

Frontend: conectar el repo a Vercel, configurar `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` como variables de entorno del proyecto en Vercel.

Backend: `supabase link --project-ref <ref>` y `supabase db push` para las
migraciones, `supabase functions deploy sync-pricing` para la función.
