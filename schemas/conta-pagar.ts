import { z } from "zod"

export const PAYABLE_CATEGORIES = [
  "FORNECEDOR",
  "ALUGUEL",
  "SALARIO",
  "IMPOSTO",
  "SERVICO",
  "OUTROS",
] as const

export const PAYABLE_STATUSES = [
  "PENDENTE",
  "PARCIAL",
  "PAGO",
  "CANCELADO",
] as const

export const PAYMENT_METHODS = [
  "DINHEIRO",
  "PIX",
  "DEBITO",
  "CREDITO",
  "VALE",
] as const

export const contaPagarSchema = z.object({
  description: z.string().min(2, "Descrição deve ter ao menos 2 caracteres"),
  supplierId: z.string().optional().or(z.literal("")),
  purchaseOrderId: z.string().optional().or(z.literal("")),
  category: z.enum(PAYABLE_CATEGORIES),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  dueDate: z.string().min(1, "Informe o vencimento"),
  notes: z.string().optional(),
})

export const contaPagarUpdateSchema = contaPagarSchema.partial()

export const pagarContaSchema = z.object({
  amount: z.coerce.number().positive("Valor do pagamento deve ser maior que zero"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
})

export type ContaPagarInput = z.infer<typeof contaPagarSchema>
export type ContaPagarUpdateInput = z.infer<typeof contaPagarUpdateSchema>
export type PagarContaInput = z.infer<typeof pagarContaSchema>
