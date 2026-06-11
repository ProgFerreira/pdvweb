import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { promocaoSchema } from "@/schemas/promocao"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"
import { detectPromoOverlap } from "@/lib/promo-overlap"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("promocoes.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params
    const { ip, userAgent } = getRequestMeta(req)

    const existing = await prisma.promotion.findFirst({
      where: withTenant(tenantId, { id }),
    })
    if (!existing) return apiError("Promoção não encontrada", 404)

    const body = await req.json()
    const parsed = promocaoSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    // Verificar sobreposição (excluindo a própria promoção)
    if (parsed.data.isActive !== false) {
      const scopeFilter = parsed.data.productId
        ? { productId: parsed.data.productId }
        : parsed.data.categoryId
        ? { categoryId: parsed.data.categoryId }
        : null
      if (scopeFilter) {
        const candidates = await prisma.promotion.findMany({
          where: { tenantId, isActive: true, ...scopeFilter, id: { not: id } },
          select: { name: true, startAt: true, endAt: true },
        })
        const conflict = detectPromoOverlap(parsed.data, candidates)
        if (conflict) return apiError(conflict, 409)
      }
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        ...parsed.data,
        startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
        endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "promotion",
      resourceId: id,
      oldData: { name: existing.name, isActive: existing.isActive },
      newData: { name: updated.name, isActive: updated.isActive },
      ip,
      userAgent,
    })

    return updated
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("promocoes.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params
    const { ip, userAgent } = getRequestMeta(req)

    const existing = await prisma.promotion.findFirst({
      where: withTenant(tenantId, { id }),
    })
    if (!existing) return apiError("Promoção não encontrada", 404)

    await prisma.promotion.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() } as never,
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "DELETE",
      resource: "promotion",
      resourceId: id,
      oldData: { name: existing.name },
      ip,
      userAgent,
    })

    return { success: true }
  })
}

