import type { QuoteResult } from '@/lib/pricing/types';
import { formatARS } from '@/lib/pricing/format';
import { Separator } from '@/components/ui/separator';

interface QuoteBreakdownProps {
  result: QuoteResult;
}

export function QuoteBreakdown({ result }: QuoteBreakdownProps) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Este es un <strong>estimado</strong> calculado en base a la temporada {result.seasonName}. El precio
        final está sujeto a confirmación de disponibilidad real por parte del equipo de Centro Umepay.
      </div>

      {result.salon.warning && (
        <div className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠ {result.salon.warning}
        </div>
      )}
      {result.salon.label && (
        <p className="text-muted-foreground">
          Salón asignado para {result.totalPeople} personas: <strong>{result.salon.label}</strong>
        </p>
      )}

      <div className="space-y-1">
        {result.accommodationLines.map((line) => (
          <div key={line.accommodationTypeId} className="flex justify-between">
            <span>
              {line.label} · {line.peopleAssigned} pers. × {result.nights} noches
            </span>
            <span>{formatARS(line.lineTotal)}</span>
          </div>
        ))}
      </div>

      {result.mealTierLabel && (
        <div className="flex justify-between">
          <span>Adicional comida: {result.mealTierLabel}</span>
          <span>{formatARS(result.mealSurchargeTotal)}</span>
        </div>
      )}

      {result.extraMealsCount > 0 && (
        <div className="flex justify-between">
          <span>Comidas sueltas extra × {result.extraMealsCount}</span>
          <span>{formatARS(result.extraMealsTotal)}</span>
        </div>
      )}

      <Separator />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatARS(result.subtotalBeforeDiscounts)}</span>
      </div>

      {result.totalDiscountPct > 0 && (
        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span>
            Descuento ({result.nightsDiscountPct}% por noches + {result.headcountDiscountPct}% por
            personas)
          </span>
          <span>-{formatARS(result.discountAmount)}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span>IVA ({result.ivaPct}% sobre el 50% del subtotal)</span>
        <span>{formatARS(result.ivaAmount)}</span>
      </div>

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
        <span>Total estimado</span>
        <span>{formatARS(result.total)}</span>
      </div>

      <div className="flex justify-between text-muted-foreground">
        <span>Seña ({result.depositPct}%)</span>
        <span>{formatARS(result.depositAmount)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Saldo al llegar</span>
        <span>{formatARS(result.balanceOnArrival)}</span>
      </div>
    </div>
  );
}
