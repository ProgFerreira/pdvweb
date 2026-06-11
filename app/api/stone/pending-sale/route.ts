/**
 * Cria uma venda em status PAGAMENTO_PENDENTE para pagamentos via maquininha Stone.
 * O webhook /api/stone/webhook confirma a transação e move para AGUARDANDO.
 *
 * Fluxo:
 *   1. PDV chama POST /api/stone/transaction → recebe stoneTransactionId
 *   2. PDV chama POST /api/stone/pending-sale → cria venda PAGAMENTO_PENDENTE
 *   3. Stone webhook POST /api/stone/webhook → confirma e atualiza para AGUARDANDO
 *   4. PDV polling GET /api/stone/transaction?id=xxx → detecta aprovação
 */

import { NextRequest } from "next/server"
import { CashStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { vendaSchema } from "@/schemas/venda"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { getNextOrderNumber } from "@/lib/order-number"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("pdv.vender")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = vendaSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const {
      items,
      payments,
      discount,
      addition,
      customerId,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryNeighborhood,
      deliveryCity,
      deliveryComplement,
      deliveryReference,
      cashRegisterId,
      orderType,
      tableId,
      waiveServiceFee,
      notes,
    } = parsed.data

    // Validar que todos os pagamentos têm stoneTransactionId
    const hasStonePayment = payments.some((p) =>
      (p.method === "DEBITO" || p.method === "CREDITO") && p.stoneTransactionId
    )
    if (!hasStonePayment) {
      return apiError("Pagamento Stone requer stoneTransactionId", 400)
    }

    const cashRegister = await prisma.cashRegister.findFirst({
      where: withTenant(tenantId, { id: cashRegisterId, status: CashStatus.ABERTO }),
    })
    if (!cashRegister) {
      return apiError("Caixa não encontrado ou fechado.", 400)
    }

    const settings = await prisma.settings.findUnique({ where: { tenantId } })
    const productIds = items.map((i) => i.productId)

    const products = await prisma.product.findMany({
      where: withTenant(tenantId, { id: { in: productIds }, isActive: true, deletedAt: null }),
    })

    if (products.length !== productIds.length) {
      return apiError("Um ou mais produtos não encontrados ou inativos", 400)
    }

    // Validar estoque
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!
      if (product.stock < item.quantity) {
        return apiError(
          `Estoque insuficiente para "${product.name}" (disponível: ${product.stock})`,
          400
        )
      }
    }

    const subtotal = items.reduce((acc, item) => {
      const product = products.find((p) => p.id === item.productId)!
      const unitPrice = item.unitPrice > 0 ? item.unitPrice : Number(product.price)
      return acc + unitPrice * item.quantity - item.discount
    }, 0)

    const serviceFeePercent = waiveServiceFee ? 0 : Number(settings?.serviceFee ?? 0)
    const serviceFeeAmount =
      serviceFeePercent > 0
        ? Math.round((subtotal * serviceFeePercent) / 100 * 100) / 100
        : 0

    const total = subtotal - discount + addition + serviceFeeAmount
    const orderNumber = await getNextOrderNumber(tenantId)

    // Criar venda em PAGAMENTO_PENDENTE — sem decrementar estoque ainda.
    // O webhook /api/stone/webhook confirma e executa os side-effects.
    const sale = await prisma.sale.create({
      data: {
        tenantId,
        orderNumber,
        status: "PAGAMENTO_PENDENTE",
        userId: session.user.id,
        customerId: customerId || null,
        customerName: customerName?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        deliveryAddress: deliveryAddress?.trim() || null,
        deliveryNeighborhood: deliveryNeighborhood?.trim() || null,
        deliveryCity: deliveryCity?.trim() || null,
        deliveryComplement: deliveryComplement?.trim() || null,
        deliveryReference: deliveryReference?.trim() || null,
        cashRegisterId,
        tableId: tableId || null,
        orderType,
        subtotal,
        discount,
        addition,
        serviceFeeAmount,
        waiveServiceFee,
        total,
        notes,
        items: {
          create: items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!
            const unitPrice = item.unitPrice > 0 ? item.unitPrice : Number(product.price)
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice,
              discount: item.discount,
              total: unitPrice * item.quantity - item.discount,
              notes: item.notes,
            }
          }),
        },
        payments: {
          create: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            change: 0,
            stoneTransactionId: p.stoneTransactionId ?? null,
            stoneStatus: "pending",
            stoneAuthCode: null,
            stoneNsu: null,
            stoneInstallments: p.stoneInstallments ?? null,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        payments: true,
      },
    })

    return { id: sale.id, orderNumber: sale.orderNumber, status: sale.status }
  })
}
