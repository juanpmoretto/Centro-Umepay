import type { MealPlan } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLAN_ITEMS: Record<string, string> = {
  none: 'Vegetariano (sin adicional de carne)',
  lunch_only: 'Solo almuerzo con adicional de carne',
  lunch_dinner: 'Almuerzo y cena con adicional de carne',
  full_board: 'Pensión completa (desayuno + almuerzo + cena)',
};

interface MealPlanSelectorProps {
  mealPlan: MealPlan | null;
  meat200gCount: number;
  meat400gCount: number;
  totalPeople: number;
  onChange: (value: { mealPlan: MealPlan | null; meat200gCount: number; meat400gCount: number }) => void;
}

export function MealPlanSelector({
  mealPlan,
  meat200gCount,
  meat400gCount,
  totalPeople,
  onChange,
}: MealPlanSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Plan de comidas (uno solo para todo el grupo)</Label>
        <Select
          value={mealPlan ?? 'none'}
          onValueChange={(v) =>
            onChange({
              mealPlan: v === 'none' ? null : (v as MealPlan),
              meat200gCount,
              meat400gCount,
            })
          }
          items={PLAN_ITEMS}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{PLAN_ITEMS.none}</SelectItem>
            <SelectItem value="lunch_only">{PLAN_ITEMS.lunch_only}</SelectItem>
            <SelectItem value="lunch_dinner">{PLAN_ITEMS.lunch_dinner}</SelectItem>
            <SelectItem value="full_board">{PLAN_ITEMS.full_board}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mealPlan && mealPlan !== 'full_board' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="meat200g">Personas con adicional 200g</Label>
            <Input
              id="meat200g"
              type="number"
              min={0}
              max={totalPeople}
              value={meat200gCount}
              onChange={(e) =>
                onChange({ mealPlan, meat200gCount: Number(e.target.value) || 0, meat400gCount })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meat400g">Personas con adicional 400g premium</Label>
            <Input
              id="meat400g"
              type="number"
              min={0}
              max={totalPeople}
              value={meat400gCount}
              onChange={(e) =>
                onChange({ mealPlan, meat200gCount, meat400gCount: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      )}

      {mealPlan === 'full_board' && (
        <p className="text-xs text-muted-foreground">
          La pensión completa siempre incluye el adicional de carne premium para todo el grupo ({totalPeople}{' '}
          personas) -- no tiene opción de elegir solo el nivel estándar.
        </p>
      )}
    </div>
  );
}
