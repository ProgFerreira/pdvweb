import { NextRequest } from "next/server"
import { CashStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { vendaSchema } from "@/schemas/venda"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId } from "@/lib/prisma-tenant"
import { withTenant } from "@/lib/prisma-tenant"
import { getNextOrderNumber } from "@/lib/order-number"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { recordStockMovement } from "@/lib/stock-movement"
import { emitNfce } from "@/lib/fiscal"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("vendas.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const statuses = searchParams.getAll("status").filter(Boolean)
    const userId = searchParams.get("userId") ?? ""
    const customerId = searchParams.get("customerId") ?? ""
    const dateFrom = searchParams.get("dateFrom") ?? ""
    const dateTo = searchParams.get("dateTo") ?? ""
    const orderType = searchParams.get("orderType") ?? ""
    const page = parseInt(searchParams.get("page") ?? "1")
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

    const where = withTenant(tenantId, {
      ...(statuses.length === 1 && { status: statuses[0] as never }),
      ...(statuses.length > 1 && { status: { in: statuses as never[] } }),
      ...(userId && { userId }),
      ...(customerId && { customerId }),
      ...(orderType && { orderType: orderType as never }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
            },
          }
        : {}),
    })

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, code: true, kitchenSector: true } } } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ])

    return { data: sales, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowSeconds: 60, prefix: "vendas" })
  if (limited) return limited
  return withApiHandler(async () => {
    const session = await requirePermission("pdv.vender")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

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
      loyaltyPointsToRedeem,
      notes,
    } = parsed.data

    const cashRegister = await prisma.cashRegister.findFirst({
      where: withTenant(tenantId, { id: cashRegisterId, status: CashStatus.ABERTO }),
    })
    if (!cashRegister) {
      return apiError("Caixa não encontrado ou fechado. Abra o caixa antes de vender.", 400)
    }

    const settings = await prisma.settings.findUnique({ where: { tenantId } })
    const productIds = items.map((i) => i.productId)

    const products = await prisma.product.findMany({
      where: withTenant(tenantId, {
        id: { in: productIds },
        isActive: true,
        deletedAt: null,
      }),
    })

    if (products.length !== productIds.length) {
      return apiError("Um ou mais produtos não encontrados ou inativos", 400)
    }

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

    // Validate loyalty points redemption (100 pts = R$1.00)
    let loyaltyDiscount = 0
    if (loyaltyPointsToRedeem > 0) {
      if (!customerId) {
        return apiError("Selecione um cliente para usar pontos de fidelidade", 400)
      }
      const loyaltyAccount = await prisma.loyaltyAccount.findUnique({ where: { customerId } })
      const availablePoints = loyaltyAccount?.points ?? 0
      if (loyaltyPointsToRedeem > availablePoints) {
        return apiError(`Pontos insuficientes. Disponível: ${availablePoints}`, 400)
      }
      loyaltyDiscount = Math.round((loyaltyPointsToRedeem / 100) * 100) / 100
    }

    const serviceFeePercent = waiveServiceFee ? 0 : Number(settings?.serviceFee ?? 0)
    const serviceFeeAmount =
      serviceFeePercent > 0 ? Math.round((subtotal * serviceFeePercent) / 100 * 100) / 100 : 0

    const total = Math.max(0, subtotal - discount - loyaltyDiscount + addition + serviceFeeAmount)
    const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0)
    if (totalPayments < total) {
      return apiError("Valor pago insuficiente", 400)
    }

    const orderNumber = await getNextOrderNumber(tenantId)

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          tenantId,
          orderNumber,
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
              change: p.method === "DINHEIRO" ? Math.max(0, p.amount - total) : 0,
              stoneTransactionId: p.stoneTransactionId ?? null,
              stoneStatus: p.stoneStatus ?? null,
              stoneAuthCode: p.stoneAuthCode ?? null,
              stoneNsu: p.stoneNsu ?? null,
              stoneInstallments: p.stoneInstallments ?? null,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
          user: { select: { id: true, name: true } },
        },
      })

      const cashPayments = payments.reduce(
        (acc, p) => {
          const map: Record<string, string> = {
            DINHEIRO: "totalCash",
            PIX: "totalPix",
            DEBITO: "totalDebit",
            CREDITO: "totalCredit",
            VALE: "totalVoucher",
          }
          const field = map[p.method]
          if (field) acc[field] = (acc[field] ?? 0) + p.amount
          return acc
        },
        {} as Record<string, number>
      )

      await tx.cashRegister.update({
        where: { id: cashRegisterId },
        data: {
          totalSales: { increment: total },
          ...Object.fromEntries(
            Object.entries(cashPayments).map(([k, v]) => [k, { increment: v }])
          ),
        },
      })

      for (const item of items) {
        await recordStockMovement({
          tx,
          tenantId,
          productId: item.productId,
          userId: session.user.id,
          type: "VENDA",
          quantity: -item.quantity,
          referenceId: newSale.id,
          notes: `Venda #${orderNumber}`,
        })
      }

      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: "OCUPADA" },
        })
      }

      if (customerId) {
        const pointsEarned = Math.floor(total)
        const pointsDelta = pointsEarned - loyaltyPointsToRedeem
        await tx.loyaltyAccount.upsert({
          where: { customerId },
          create: { tenantId, customerId, points: Math.max(0, pointsDelta) },
          update: { points: { increment: pointsDelta } },
        })
      }

      return newSale
    })

    const nfce = await emitNfce({
      saleId: sale.id,
      orderNumber: sale.orderNumber,
      tenantId,
      total: Number(sale.total),
      cpfCliente: sale.customer?.cpf ?? null,
      items: sale.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        ncm: i.product.ncm,
        cfop: i.product.cfop,
        cst: i.product.cst,
        origin: i.product.origin,
      })),
    })

    if (nfce.status !== "NAO_EMITIR") {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          nfceStatus: nfce.status,
          nfceKey: nfce.key ?? null,
          nfceNumber: nfce.number ?? null,
          nfceXmlUrl: nfce.xmlUrl ?? null,
          nfcePdfUrl: nfce.pdfUrl ?? null,
        },
      })
    }

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "sale",
      resourceId: sale.id,
      newData: { orderNumber: sale.orderNumber, total: Number(sale.total) },
      ip,
      userAgent,
    })

    return sale
  })
}
