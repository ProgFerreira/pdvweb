import { z } from "zod"

export const promocaoSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().min(0.01),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type PromocaoInput = z.infer<typeof promocaoSchema>
