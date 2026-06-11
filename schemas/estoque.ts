import { z } from "zod"

export const stockMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["ENTRADA", "AJUSTE", "PERDA"]),
  quantity: z.coerce.number().int().refine((n) => n !== 0, "Quantidade não pode ser zero"),
  notes: z.string().optional(),
})

export type StockMovementInput = z.infer<typeof stockMovementSchema>
