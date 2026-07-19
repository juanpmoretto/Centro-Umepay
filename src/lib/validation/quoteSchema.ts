import { z } from 'zod';

export const accommodationMixEntrySchema = z.object({
  accommodationTypeId: z.string().min(1),
  peopleAssigned: z.coerce.number().int().min(1),
});

export const newQuoteSchema = z.object({
  retreatStartDate: z.string().min(1, 'Elegí la fecha del retiro'),
  retreatNights: z.coerce.number().int().min(1, 'Al menos 1 noche'),
  accommodationMix: z.array(accommodationMixEntrySchema).min(1, 'Agregá al menos un tipo de alojamiento'),
  mealTierId: z.string().nullable(),
  staffQuotedTotal: z.coerce.number().min(0, 'Ingresá el precio ya calculado'),
  staffNote: z.string().trim().optional(),
});

export type NewQuoteFormValues = z.infer<typeof newQuoteSchema>;

export const quoteInquiryMessageSchema = z.object({
  clientMessage: z.string().trim().max(1000).optional(),
});
