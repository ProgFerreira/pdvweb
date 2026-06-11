import { z } from "zod"

export const abrirCaixaSchema = z.object({
  initialAmount: z.coerce.number().min(0, "Valor inicial não pode ser negativo"),
  notes: z.string().optional(),
})

export const fecharCaixaSchema = z.object({
  countedCash: z.coerce.number().min(0, "Informe o dinheiro contado"),
  closeNotes: z.string().optional(),
  notes: z.string().optional(),
})

export const movimentoCaixaSchema = z.object({
  type: z.enum(["ENTRADA", "SAIDA"]),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição obrigatória"),
})

export type AbrirCaixaInput = z.infer<typeof abrirCaixaSchema>
export type FecharCaixaInput = z.infer<typeof fecharCaixaSchema>
export type MovimentoCaixaInput = z.infer<typeof movimentoCaixaSchema>
