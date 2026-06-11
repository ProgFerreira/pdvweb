import { z } from "zod"

export const fornecedorSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  supplyType: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const fornecedorUpdateSchema = fornecedorSchema.partial()

export type FornecedorInput = z.infer<typeof fornecedorSchema>
export type FornecedorUpdateInput = z.infer<typeof fornecedorUpdateSchema>
