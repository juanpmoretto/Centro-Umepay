import type { QuoteResult } from '@/lib/pricing/types';
import { formatARS } from '@/lib/pricing/format';
import { Separator } from '@/components/ui/separator';

interface QuoteBreakdownProps {
  result: QuoteResult;
}

const PLAN_LABELS: Record<string, string> = {
  lunch_only: 'Solo almuerzo',
  lunch_dinner: 'Almuerzo y cena',
  full_board: 'Pensión completa',
};

export function QuoteBreakdown({ result }: QuoteBreakdownProps) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Este es un <strong>estimado</strong> calculado en base a la temporada {result.seasonName} ·{' '}
        {result.totalPeople} personas. El precio final está sujeto a confirmación de disponibilidad real
        por parte del equipo de Centro Umepay.
      </div>

      {result.capacityWarnings.map((w) => (
        <div
          key={w.category}
          className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          ⚠ Cupo excedido en "{w.category}": {w.used} de {w.max} unidades disponibles.
        </div>
      ))}

      {result.salon.warning && (
        <div className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠ {result.salon.warning}
        </div>
      )}
      {result.salon.label && (
        <p className="text-muted-foreground">
          Salón asignado: <strong>{result.salon.label}</strong>
        </p>
      )}

      <div className="space-y-1">
        {result.accommodationLines.map((line) => (
          <div key={line.accommodationTypeId} className="flex justify-between">
            <span>
              {line.label} · {line.units} unidad(es) × {line.capacity} pers. × {result.nights} noches
            </span>
            <span>{formatARS(line.lodgingLineTotal + line.foodLineTotal)}</span>
          </div>
        ))}
        <div className="flex justify-between text-muted-foreground">
          <span>Uso de salón</span>
          <span>{formatARS(result.salonCostTotal)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between">
        <span>Alojamiento (IVA {result.ivaPct}% incluido)</span>
        <span>{formatARS(result.accommodationTotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Comidas (IVA {result.ivaPct}% incluido)</span>
        <span>{formatARS(result.foodTotal)}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Total bruto</span>
        <span>{formatARS(result.grossBeforeDiscount)}</span>
      </div>

      {result.nightsDiscountAmount > 0 && (
        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span>Descuento por noches ({result.nightsDiscountPct}%)</span>
          <span>-{formatARS(result.nightsDiscountAmount)}</span>
        </div>
      )}
      {result.headcountDiscountAmount > 0 && (
        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span>Descuento por personas ({result.headcountDiscountPct}%)</span>
          <span>-{formatARS(result.headcountDiscountAmount)}</span>
        </div>
      )}
      {result.liberadosDiscountAmount > 0 && (
        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span>Bonificación liberados ({result.liberadosMultiplier}× trailer)</span>
          <span>-{formatARS(result.liberadosDiscountAmount)}</span>
        </div>
      )}

      <Separator />

      <div className="flex justify-between font-medium">
        <span>Total con descuentos incluidos</span>
        <span>{formatARS(result.subtotalAfterDiscounts)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Seña ({result.depositPct}%, sin descuento)</span>
        <span>{formatARS(result.depositAmount)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Saldo (en efectivo, {result.cashDiscountPct}% de descuento incluido)</span>
        <span>{formatARS(result.balanceOnArrival)}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>TOTAL A COBRAR</span>
        <span>{formatARS(result.totalACobrar)}</span>
      </div>

      {result.mealAddon.plan && (
        <div className="flex justify-between">
          <span>
            Adicional de carne ({PLAN_LABELS[result.mealAddon.plan]}
            {result.mealAddon.plan !== 'full_board'
              ? ` · ${result.mealAddon.meat200gCount} con 200g, ${result.mealAddon.meat400gCount} con 400g`
              : ''}
            )
          </span>
          <span>{formatARS(result.mealAddon.total)}</span>
        </div>
      )}

      {result.salonAdjustmentAmount !== 0 && (
        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span>Ajuste por salón {result.salon.label}</span>
          <span>{formatARS(result.salonAdjustmentAmount)}</span>
        </div>
      )}

      {result.manualAdjustmentAmount !== 0 && (
        <div className="flex justify-between">
          <span>Ajuste manual{result.manualAdjustmentNote ? `: ${result.manualAdjustmentNote}` : ''}</span>
          <span>{formatARS(result.manualAdjustmentAmount)}</span>
        </div>
      )}

      <Separator />

      <div className="flex justify-between text-base font-medium">
        <span>Total final estimado</span>
        <span>{formatARS(result.total)}</span>
      </div>
    </div>
  );
}
