import { z } from "zod"

export const categoriaSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const categoriaUpdateSchema = categoriaSchema.partial()

export type CategoriaInput = z.infer<typeof categoriaSchema>
