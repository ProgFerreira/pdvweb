import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { statusUpdateSchema } from "@/schemas/venda"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { recordStockMovement } from "@/lib/stock-movement"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("fila.gerir")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

    const { id } = await params
    const body = await req.json()
    const parsed = statusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.sale.findFirst({
      where: withTenant(tenantId, { id }),
      include: { items: true },
    })
    if (!existing) return apiError("Venda não encontrada", 404)

    const sale = await prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id },
        data: {
          status: parsed.data.status,
          ...(parsed.data.cancelReason && { cancelReason: parsed.data.cancelReason }),
        },
        include: {
          customer: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      })

      if (parsed.data.status === "CANCELADO" && existing.status !== "CANCELADO") {
        for (const item of existing.items) {
          await recordStockMovement({
            tx,
            tenantId,
            productId: item.productId,
            userId: session.user.id,
            type: "CANCELAMENTO",
            quantity: item.quantity,
            referenceId: id,
            notes: parsed.data.cancelReason ?? "Cancelamento",
          })
        }
      }

      return updated
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "sale",
      resourceId: id,
      oldData: { status: existing.status },
      newData: { status: parsed.data.status },
      ip,
      userAgent,
    })

    return sale
  })
}
