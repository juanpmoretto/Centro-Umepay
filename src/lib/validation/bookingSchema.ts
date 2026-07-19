import { z } from 'zod';

export const estimatedParticipantsOptions = ['10-12', '16-20', '20-30', '30+'] as const;

export const bookingSchema = z
  .object({
    startDate: z.string().min(1, 'Elegí la fecha de inicio'),
    endDate: z.string().min(1, 'Elegí la fecha de fin'),
    organizerName: z.string().trim().min(2, 'Ingresá tu nombre y apellido'),
    organizerEmail: z.string().trim().email('Ingresá un email válido'),
    organizerPhone: z.string().trim().min(6, 'Ingresá un teléfono de contacto'),
    operatingLocation: z.string().trim().min(2, 'Contanos desde dónde organizás tus retiros'),
    isFirstTimeFacilitating: z.enum(['yes', 'no'], { message: 'Elegí una opción' }),
    retreatType: z.string().trim().min(2, 'Contanos qué tipo de retiro querés ofrecer'),
    profession: z.string().trim().min(2, 'Contanos tu profesión u ocupación'),
    estimatedParticipants: z.enum(estimatedParticipantsOptions, { message: 'Elegí un rango' }),
    familiarWithCenter: z.enum(['yes', 'no'], { message: 'Elegí una opción' }),
    referralSource: z.string().trim().min(2, 'Contanos cómo nos encontraste'),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['endDate'],
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;
