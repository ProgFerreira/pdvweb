import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { stockMovementSchema } from "@/schemas/estoque"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { recordStockMovement } from "@/lib/stock-movement"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("estoque.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId") ?? ""
    const page = parseInt(searchParams.get("page") ?? "1")
    const pageSize = parseInt(searchParams.get("pageSize") ?? "30")

    const where = withTenant(tenantId, {
      ...(productId && { productId }),
    })

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ])

    return { data: movements, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("estoque.movimentar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

    const body = await req.json()
    const parsed = stockMovementSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const product = await prisma.product.findFirst({
      where: withTenant(tenantId, { id: parsed.data.productId, deletedAt: null }),
    })
    if (!product) return apiError("Produto não encontrado", 404)

    let qty = parsed.data.quantity
    if (parsed.data.type === "PERDA" && qty > 0) qty = -qty
    if (parsed.data.type === "ENTRADA" && qty < 0) qty = Math.abs(qty)
    if (parsed.data.type === "AJUSTE") {
      // quantity = target stock delta from form (signed)
    }

    const movement = await prisma.$transaction(async (tx) => {
      const result = await recordStockMovement({
        tx,
        tenantId,
        productId: parsed.data.productId,
        userId: session.user.id,
        type: parsed.data.type,
        quantity: qty,
        notes: parsed.data.notes,
      })
      return result
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "stock_movement",
      resourceId: parsed.data.productId,
      newData: parsed.data,
      ip,
      userAgent,
    })

    return movement
  })
}
