import { z } from "zod"

export const purchaseInvoiceStatusEnum = z.enum(["PENDENTE", "PAGO", "CANCELADO"])
export const purchaseInvoicePaymentEnum = z.enum([
  "DINHEIRO",
  "PIX",
  "BOLETO",
  "TRANSFERENCIA",
  "CARTAO",
])

export const notaFiscalCompraSchema = z.object({
  supplierId: z.string().min(1, "Fornecedor é obrigatório"),
  number: z.string().max(50).optional().or(z.literal("")),
  issueDate: z.string().min(1, "Data de emissão é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  status: purchaseInvoiceStatusEnum.optional(),
  paymentMethod: purchaseInvoicePaymentEnum.optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  fileUrl: z.string().optional().nullable(),
  fileMime: z.string().optional().nullable(),
})

export const notaFiscalCompraUpdateSchema = notaFiscalCompraSchema.partial()

export type NotaFiscalCompraInput = z.infer<typeof notaFiscalCompraSchema>
export type NotaFiscalCompraUpdateInput = z.infer<typeof notaFiscalCompraUpdateSchema>

export const PAYMENT_METHOD_LABELS: Record<
  z.infer<typeof purchaseInvoicePaymentEnum>,
  string
> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  CARTAO: "Cartão",
}

export const STATUS_LABELS: Record<z.infer<typeof purchaseInvoiceStatusEnum>, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
}
