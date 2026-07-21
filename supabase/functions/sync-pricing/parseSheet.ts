import { z } from 'https://esm.sh/zod@4';

// Matches the "Tarifas_App" tab layout: one flat tab, several sub-tables each
// preceded by a "### SECTION_NAME" marker row and immediately followed by its
// own header row. Locating sections by name (not fixed row/column position)
// means staff can freely insert rows, reorder columns, or add notes without
// breaking the sync.

export type SheetGrid = string[][];

interface RawSection {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  /** 1-based row number of the header row, for human-friendly error messages */
  headerRowNumber: number;
}

function isBlankRow(row: string[] | undefined): boolean {
  return !row || row.every((cell) => !cell || cell.trim() === '');
}

export function splitIntoSections(grid: SheetGrid): RawSection[] {
  const sections: RawSection[] = [];

  for (let i = 0; i < grid.length; i++) {
    const cellA = grid[i]?.[0]?.trim() ?? '';
    if (!cellA.startsWith('### ')) continue;

    const name = cellA.slice(4).trim();
    const headerRowIndex = i + 1;
    const headers = (grid[headerRowIndex] ?? []).map((h) => h.trim());

    const rows: Record<string, string>[] = [];
    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const row = grid[r];
      if (isBlankRow(row) || (row[0] ?? '').trim().startsWith('### ')) break;
      const record: Record<string, string> = {};
      headers.forEach((h, colIndex) => {
        if (h) record[h] = (row[colIndex] ?? '').trim();
      });
      rows.push(record);
    }

    sections.push({ name, headers, rows, headerRowNumber: headerRowIndex + 1 });
  }

  return sections;
}

const numberFromString = z.string().transform((v, ctx) => {
  const n = Number(v);
  if (Number.isNaN(n)) {
    ctx.addIssue({ code: 'custom', message: `"${v}" no es un número válido` });
    return z.NEVER;
  }
  return n;
});

const optionalNumberFromString = z
  .string()
  .transform((v) => (v.trim() === '' ? null : Number(v)))
  .refine((v) => v === null || !Number.isNaN(v), 'no es un número válido');

export const seasonRowSchema = z.object({
  season_name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  // Charged every night, for the whole group. Umepay re-prices roughly
  // every two months (not by calendar season), so this varies per row.
  salon_per_day: numberFromString,
  // Base vegetarian food price per person per night for this season --
  // each accommodation line's food cost is this times its capacity.
  food_price_per_person_per_night: numberFromString,
  // Base price used by the fixed carne-addon formula (200g/400g unit
  // prices are derived from this, not entered directly).
  meat_base_price: numberFromString,
});

export const accommodationTypeRowSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  min_capacity: numberFromString,
  max_capacity: numberFromString,
  total_units: numberFromString,
  bathroom_type: z.enum(['interior', 'exterior']),
  // Shared-capacity-pool grouping for the non-blocking cupo warnings
  // (trailers combined, cabañas con baño combined, cabañas sin baño combined).
  category: z.enum(['trailer', 'cabin_interior', 'cabin_exterior', 'carpa']),
});

export const rateRowSchema = z.object({
  season_name: z.string().min(1),
  accommodation_code: z.string().min(1),
  // Lodging-only per-night rate for the whole accommodation configuration
  // (e.g. the whole "cuádruple" cabin) -- NOT a per-person rate, and food
  // is priced separately (see seasons.food_price_per_person_per_night).
  // See accommodation_types for each config's fixed capacity.
  lodging_rate_per_night: numberFromString,
});

export const nightsDiscountRowSchema = z.object({
  // Discount tiers are per-season now (one season currently has a unique
  // promo at the 5-9 night tier the others don't have).
  season_name: z.string().min(1),
  min_nights: numberFromString,
  max_nights: optionalNumberFromString,
  discount_pct: numberFromString,
});

export const headcountDiscountRowSchema = z.object({
  min_people: numberFromString,
  discount_pct: numberFromString,
});

export const liberadosTierRowSchema = z.object({
  min_people: numberFromString,
  max_people: optionalNumberFromString,
  // Multiplier applied to a "trailer x1" line's cost (that season's rate,
  // one night + its salon share), subtracted as a bonification.
  multiplier: numberFromString,
});

export const salonThresholdRowSchema = z.object({
  salon_code: z.enum(['nave', 'nodriza']),
  label: z.string().min(1),
  min_people: numberFromString,
  max_people: optionalNumberFromString,
  long_weekend_min_nights: optionalNumberFromString,
  long_weekend_min_people: optionalNumberFromString,
  // Flat amount added to (positive) or subtracted from (negative) the
  // retreat's final total for this salon. Nave's cost is already folded
  // into the per-person accommodation rates, so it's normally 0; Nodriza
  // carries a flat discount.
  flat_adjustment: numberFromString,
});

export const globalSettingRowSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export interface ParsedPricingSheet {
  seasons: z.infer<typeof seasonRowSchema>[];
  accommodationTypes: z.infer<typeof accommodationTypeRowSchema>[];
  rates: z.infer<typeof rateRowSchema>[];
  nightsDiscounts: z.infer<typeof nightsDiscountRowSchema>[];
  headcountDiscounts: z.infer<typeof headcountDiscountRowSchema>[];
  liberadosTiers: z.infer<typeof liberadosTierRowSchema>[];
  salonThresholds: z.infer<typeof salonThresholdRowSchema>[];
  globalSettings: Record<string, string>;
}

export class SheetValidationError extends Error {}

function parseSection<T>(
  sections: RawSection[],
  name: string,
  schema: z.ZodType<T>,
  required: boolean,
): T[] {
  const section = sections.find((s) => s.name === name);
  if (!section) {
    if (required) {
      throw new SheetValidationError(`No se encontró la sección "### ${name}" en la pestaña Tarifas_App.`);
    }
    return [];
  }

  const results: T[] = [];
  section.rows.forEach((row, i) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) {
      const sheetRow = section.headerRowNumber + 1 + i;
      const issue = parsed.error.issues[0];
      throw new SheetValidationError(
        `Sección "${name}", fila ${sheetRow}: ${issue.path.join('.')}: ${issue.message}`,
      );
    }
    results.push(parsed.data);
  });

  return results;
}

/** Parses and validates every section, including cross-section referential integrity. */
export function parsePricingSheet(grid: SheetGrid): ParsedPricingSheet {
  const sections = splitIntoSections(grid);

  const seasons = parseSection(sections, 'SEASONS', seasonRowSchema, true);
  const accommodationTypes = parseSection(sections, 'ACCOMMODATION_TYPES', accommodationTypeRowSchema, true);
  const rates = parseSection(sections, 'RATES', rateRowSchema, true);
  const nightsDiscounts = parseSection(sections, 'DISCOUNTS_NIGHTS', nightsDiscountRowSchema, true);
  const headcountDiscounts = parseSection(sections, 'DISCOUNTS_HEADCOUNT', headcountDiscountRowSchema, true);
  const liberadosTiers = parseSection(sections, 'LIBERADOS_TIERS', liberadosTierRowSchema, true);
  const salonThresholds = parseSection(sections, 'SALON_THRESHOLDS', salonThresholdRowSchema, true);
  const globalSettingRows = parseSection(sections, 'GLOBAL_SETTINGS', globalSettingRowSchema, false);

  const seasonNames = new Set(seasons.map((s) => s.season_name));
  const accommodationCodes = new Set(accommodationTypes.map((a) => a.code));

  for (const rate of rates) {
    if (!seasonNames.has(rate.season_name)) {
      throw new SheetValidationError(
        `Sección "RATES": temporada desconocida "${rate.season_name}" (revisar contra la sección SEASONS).`,
      );
    }
    if (!accommodationCodes.has(rate.accommodation_code)) {
      throw new SheetValidationError(
        `Sección "RATES": accommodation_code desconocido "${rate.accommodation_code}" (revisar contra la sección ACCOMMODATION_TYPES).`,
      );
    }
  }

  for (const discount of nightsDiscounts) {
    if (!seasonNames.has(discount.season_name)) {
      throw new SheetValidationError(
        `Sección "DISCOUNTS_NIGHTS": temporada desconocida "${discount.season_name}" (revisar contra la sección SEASONS).`,
      );
    }
  }

  const globalSettings = Object.fromEntries(globalSettingRows.map((r) => [r.key, r.value]));

  return {
    seasons,
    accommodationTypes,
    rates,
    nightsDiscounts,
    headcountDiscounts,
    liberadosTiers,
    salonThresholds,
    globalSettings,
  };
}
