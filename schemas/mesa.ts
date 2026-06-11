import { z } from "zod"

export const mesaSchema = z.object({
  number: z.coerce.number().int().min(1),
  name: z.string().optional(),
  capacity: z.coerce.number().int().min(1),
  status: z.enum(["LIVRE", "OCUPADA", "RESERVADA"]).optional(),
  isActive: z.boolean().optional(),
})

export type MesaInput = z.infer<typeof mesaSchema>
