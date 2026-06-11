import { z } from "zod"

export const usuarioSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["ADMIN", "GERENTE", "CAIXA", "ATENDENTE", "COZINHA"]),
  isActive: z.boolean().optional(),
})

export const usuarioUpdateSchema = usuarioSchema
  .omit({ password: true })
  .extend({ password: z.string().min(6).optional().or(z.literal("")) })
  .partial()

export type UsuarioInput = z.infer<typeof usuarioSchema>
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>
