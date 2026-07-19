// Static list of long-weekend start dates (the Friday/holiday-eve date) used
// only to decide whether the Nave salón's "long weekend: min 3 nights + 20
// people" rule applies. This needs to be confirmed/maintained by Umepay staff
// each year (Argentina's "fines de semana largos" are set by government
// decree and shift) -- treat these as a reasonable placeholder, not a source
// of truth. TODO: fold this into the Tarifas_App sheet (Phase 3) instead of
// hand-maintaining it in code.
export const LONG_WEEKEND_START_DATES_2026: string[] = [
  '2026-01-30', // Carnaval eve (approx.)
  '2026-03-20', // Día de la Memoria weekend
  '2026-04-02', // Día del Veterano weekend
  '2026-05-22', // Revolución de Mayo weekend
  '2026-06-19', // Paso a la Inmortalidad de Güemes weekend
  '2026-08-14', // Paso a la Inmortalidad de San Martín weekend
  '2026-10-09', // Día del Respeto a la Diversidad Cultural weekend
  '2026-11-20', // Día de la Soberanía Nacional weekend
  '2026-12-07', // Día de la Inmaculada Concepción weekend
];
