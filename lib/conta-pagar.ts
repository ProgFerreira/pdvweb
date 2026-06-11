import type { PayableStatus } from "@prisma/client"

export function resolvePayableDisplayStatus(
  status: PayableStatus,
  dueDate: Date,
  paidAmount: number,
  amount: number
): PayableStatus | "VENCIDO" {
  if (status === "CANCELADO" || status === "PAGO") return status
  if (paidAmount > 0 && paidAmount < amount) return "PARCIAL"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  if (status === "PENDENTE" && due < today) return "VENCIDO"
  return status
}

export const PAYABLE_CATEGORY_LABELS: Record<string, string> = {
  FORNECEDOR: "Fornecedor",
  ALUGUEL: "Aluguel",
  SALARIO: "Salário",
  IMPOSTO: "Imposto",
  SERVICO: "Serviço",
  OUTROS: "Outros",
}

export const PAYABLE_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido",
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  VALE: "Vale",
}
