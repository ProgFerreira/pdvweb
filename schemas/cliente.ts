import { z } from "zod"

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  return rest === parseInt(digits[10])
}

export const clienteSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  phone: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((v) => !v || isValidCpf(v), "CPF inválido"),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const clienteUpdateSchema = clienteSchema.partial()

export type ClienteInput = z.infer<typeof clienteSchema>
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
