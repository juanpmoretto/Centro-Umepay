import type { AccommodationTypeRow } from '@/lib/supabase/types';
import type { AccommodationMixInput } from '@/lib/pricing/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

interface AccommodationMixEditorProps {
  accommodationTypes: AccommodationTypeRow[];
  value: AccommodationMixInput[];
  onChange: (value: AccommodationMixInput[]) => void;
}

export function AccommodationMixEditor({ accommodationTypes, value, onChange }: AccommodationMixEditorProps) {
  const accommodationItems = Object.fromEntries(accommodationTypes.map((t) => [t.id, t.label]));

  function addRow() {
    const firstUnused = accommodationTypes.find((t) => !value.some((v) => v.accommodationTypeId === t.id));
    const accommodationTypeId = firstUnused?.id ?? accommodationTypes[0]?.id ?? '';
    onChange([...value, { accommodationTypeId, peopleAssigned: 1 }]);
  }

  function updateRow(index: number, patch: Partial<AccommodationMixInput>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {value.map((row, index) => {
        const accType = accommodationTypes.find((t) => t.id === row.accommodationTypeId);
        return (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={row.accommodationTypeId}
              onValueChange={(id) => id && updateRow(index, { accommodationTypeId: id })}
              items={accommodationItems}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Tipo de alojamiento" />
              </SelectTrigger>
              <SelectContent>
                {accommodationTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={accType?.min_capacity ?? 1}
              max={(accType?.max_capacity ?? 1) * (accType?.total_units ?? 1)}
              className="w-24"
              value={row.peopleAssigned}
              onChange={(e) => updateRow(index, { peopleAssigned: Number(e.target.value) || 1 })}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="size-4" /> Agregar tipo de alojamiento
      </Button>
    </div>
  );
}
