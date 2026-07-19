import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { bookingSchema, estimatedParticipantsOptions, type BookingFormValues } from '@/lib/validation/bookingSchema';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const YES_NO_ITEMS = { yes: 'Sí', no: 'No' };
const PARTICIPANTS_ITEMS = Object.fromEntries(estimatedParticipantsOptions.map((opt) => [opt, opt]));

interface BookingFormProps {
  dateRange: DateRange | undefined;
  onSubmitted: () => void;
}

export function BookingForm({ dateRange, onSubmitted }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting, submitCount },
    setError,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      organizerName: '',
      organizerEmail: '',
      organizerPhone: '',
      operatingLocation: '',
      isFirstTimeFacilitating: '' as never,
      retreatType: '',
      profession: '',
      estimatedParticipants: '' as never,
      familiarWithCenter: '' as never,
      referralSource: '',
    },
  });

  // Only the date fields track the calendar selection reactively -- every
  // other field uses normal defaultValues, so picking/changing dates never
  // wipes out text the user already typed elsewhere in the form.
  useEffect(() => {
    setValue('startDate', dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '');
    setValue('endDate', dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '');
  }, [dateRange, setValue]);

  async function onSubmit(values: BookingFormValues) {
    const { error } = await supabase.from('booking_requests').insert({
      start_date: values.startDate,
      end_date: values.endDate,
      organizer_name: values.organizerName,
      organizer_email: values.organizerEmail,
      organizer_phone: values.organizerPhone,
      operating_location: values.operatingLocation,
      is_first_time_facilitating: values.isFirstTimeFacilitating === 'yes',
      retreat_type: values.retreatType,
      profession: values.profession,
      estimated_participants: values.estimatedParticipants,
      familiar_with_center: values.familiarWithCenter === 'yes',
      referral_source: values.referralSource,
    });

    if (error) {
      setError('root', { message: 'No pudimos enviar tu solicitud. Probá de nuevo en unos segundos.' });
      return;
    }

    reset();
    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left">
      {!dateRange?.from || !dateRange?.to ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Elegí primero el rango de fechas en el calendario de arriba.
        </p>
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Fechas seleccionadas: <strong>{format(dateRange.from, 'dd/MM/yyyy')}</strong> a{' '}
          <strong>{format(dateRange.to, 'dd/MM/yyyy')}</strong>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="organizerName">Nombre y apellido</Label>
          <Input id="organizerName" {...register('organizerName')} />
          {errors.organizerName && <p className="text-xs text-destructive">{errors.organizerName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="organizerEmail">Email</Label>
          <Input id="organizerEmail" type="email" {...register('organizerEmail')} />
          {errors.organizerEmail && <p className="text-xs text-destructive">{errors.organizerEmail.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="organizerPhone">Teléfono</Label>
          <Input id="organizerPhone" {...register('organizerPhone')} />
          {errors.organizerPhone && <p className="text-xs text-destructive">{errors.organizerPhone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="operatingLocation">¿Desde dónde organizás tus retiros?</Label>
          <Input id="operatingLocation" {...register('operatingLocation')} />
          {errors.operatingLocation && (
            <p className="text-xs text-destructive">{errors.operatingLocation.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>¿Es tu primera vez facilitando un retiro?</Label>
          <Controller
            control={control}
            name="isFirstTimeFacilitating"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} items={YES_NO_ITEMS}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.isFirstTimeFacilitating && (
            <p className="text-xs text-destructive">{errors.isFirstTimeFacilitating.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retreatType">¿Qué tipo de retiro querés ofrecer?</Label>
          <Input id="retreatType" {...register('retreatType')} />
          {errors.retreatType && <p className="text-xs text-destructive">{errors.retreatType.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profession">Tu profesión / a qué te dedicás</Label>
          <Input id="profession" {...register('profession')} />
          {errors.profession && <p className="text-xs text-destructive">{errors.profession.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Cantidad estimada de participantes</Label>
          <Controller
            control={control}
            name="estimatedParticipants"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} items={PARTICIPANTS_ITEMS}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un rango" />
                </SelectTrigger>
                <SelectContent>
                  {estimatedParticipantsOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.estimatedParticipants && (
            <p className="text-xs text-destructive">{errors.estimatedParticipants.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>¿Ya conocés Centro Umepay?</Label>
          <Controller
            control={control}
            name="familiarWithCenter"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} items={YES_NO_ITEMS}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.familiarWithCenter && (
            <p className="text-xs text-destructive">{errors.familiarWithCenter.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="referralSource">¿Cómo nos encontraste?</Label>
          <Input id="referralSource" {...register('referralSource')} />
          {errors.referralSource && <p className="text-xs text-destructive">{errors.referralSource.message}</p>}
        </div>
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
      </Button>
      {submitCount > 0 && Object.keys(errors).length > 0 && (
        <p className="text-xs text-destructive">Revisá los campos marcados arriba.</p>
      )}
    </form>
  );
}
