import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { purchaseOrderSchema } from "@/schemas/compra"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { recordStockMovement } from "@/lib/stock-movement"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("compras.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const page = parseInt(new URL(req.url).searchParams.get("page") ?? "1")
    const pageSize = 20

    const where = withTenant(tenantId, {})
    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, code: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    return { data: orders, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("compras.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

    const body = await req.json()
    const parsed = purchaseOrderSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const { supplierId, items, notes } = parsed.data
    const confirm = body.confirm === true

    const supplier = await prisma.supplier.findFirst({
      where: withTenant(tenantId, { id: supplierId, deletedAt: null }),
    })
    if (!supplier) return apiError("Fornecedor não encontrado", 404)

    const total = items.reduce((acc, i) => acc + i.unitCost * i.quantity, 0)

    const order = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId,
          supplierId,
          userId: session.user.id,
          status: confirm ? "CONFIRMADA" : "RASCUNHO",
          total,
          notes,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitCost: i.unitCost,
              total: i.unitCost * i.quantity,
            })),
          },
        },
        include: { items: true, supplier: true },
      })

      if (confirm) {
        for (const item of items) {
          await recordStockMovement({
            tx,
            tenantId,
            productId: item.productId,
            userId: session.user.id,
            type: "COMPRA",
            quantity: item.quantity,
            referenceId: po.id,
            notes: `Compra ${supplier.name}`,
          })
          await tx.product.update({
            where: { id: item.productId },
            data: { cost: item.unitCost },
          })
        }
      }

      return po
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "purchase_order",
      resourceId: order.id,
      newData: { total, status: order.status },
      ip,
      userAgent,
    })

    return order
  })
}
