import { z } from "zod"

export const produtoSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  barcode: z.string().optional(),
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Categoria obrigatória"),
  supplierId: z.string().optional(),
  kitchenSector: z.enum(["GRELHA", "ACOMPANHAMENTOS", "BEBIDAS", "SOBREMESAS", "GERAL"]).optional(),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  cost: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  ncm: z.string().optional(),
  cfop: z.string().optional(),
  cst: z.string().optional(),
  origin: z.coerce.number().int().min(0).max(8).optional(),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
})

export const produtoUpdateSchema = produtoSchema.partial()

export type ProdutoInput = z.infer<typeof produtoSchema>
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>
