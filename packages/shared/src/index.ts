import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const addPetSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  species: z.string().min(2, 'La especie es obligatoria'),
  breed: z.string().optional(),
  color: z.string().optional(),
  birth_year: z.coerce.number().int().min(1990).max(new Date().getFullYear()).optional(),
  photo_url: z.string().url().optional().or(z.literal(''))
});

export const linkTagSchema = z.object({
  code: z.string().min(3, 'El código del tag es obligatorio').max(50)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AddPetInput = z.infer<typeof addPetSchema>;
export type LinkTagInput = z.infer<typeof linkTagSchema>;
