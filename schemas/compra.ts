import { z } from "zod"

export const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().min(0),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Adicione ao menos um item"),
})

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>
