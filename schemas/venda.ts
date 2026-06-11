import { z } from "zod"

export const vendaItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

export const vendaPaymentSchema = z.object({
  method: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO", "VALE"]),
  amount: z.coerce.number().min(0.01),
  stoneTransactionId: z.string().optional(),
  stoneStatus: z.string().optional(),
  stoneAuthCode: z.string().optional(),
  stoneNsu: z.string().optional(),
  stoneInstallments: z.number().int().optional(),
})

export const vendaSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(30).optional(),
  deliveryAddress: z.string().max(500).optional(),
  deliveryNeighborhood: z.string().max(100).optional(),
  deliveryCity: z.string().max(100).optional(),
  deliveryComplement: z.string().max(200).optional(),
  deliveryReference: z.string().max(200).optional(),
  cashRegisterId: z.string().min(1, "Caixa obrigatório"),
  orderType: z.enum(["BALCAO", "RETIRADA", "DELIVERY_PROPRIO"]).default("BALCAO"),
  tableId: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  addition: z.coerce.number().min(0).default(0),
  waiveServiceFee: z.boolean().default(false),
  loyaltyPointsToRedeem: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(vendaItemSchema).min(1, "Adicione ao menos um item"),
  payments: z.array(vendaPaymentSchema).min(1, "Selecione a forma de pagamento"),
})

export const statusUpdateSchema = z.object({
  status: z.enum(["AGUARDANDO", "EM_PREPARO", "PRONTO", "ENTREGUE", "CANCELADO"]),
  cancelReason: z.string().optional(),
})

export type VendaInput = z.infer<typeof vendaSchema>
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>
