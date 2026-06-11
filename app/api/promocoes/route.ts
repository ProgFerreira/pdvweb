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

export async function GET() {
  return withApiHandler(async () => {
    const session = await requirePermission("promocoes.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const promotions = await prisma.promotion.findMany({
      where: withTenant(tenantId, {}),
      orderBy: { createdAt: "desc" },
    })
    return { data: promotions }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("promocoes.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

    const body = await req.json()
    const parsed = promocaoSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    // Verificar sobreposição de promoções ativas no mesmo escopo e período
    if (parsed.data.isActive !== false) {
      const scopeFilter = parsed.data.productId
        ? { productId: parsed.data.productId }
        : parsed.data.categoryId
        ? { categoryId: parsed.data.categoryId }
        : null

      if (scopeFilter) {
        const candidates = await prisma.promotion.findMany({
          where: { tenantId, isActive: true, ...scopeFilter },
          select: { name: true, startAt: true, endAt: true },
        })
        const conflict = detectPromoOverlap(parsed.data, candidates)
        if (conflict) return apiError(conflict, 409)
      }
    }

    const promotion = await prisma.promotion.create({
      data: {
        tenantId,
        ...parsed.data,
        startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
        endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "promotion",
      resourceId: promotion.id,
      newData: parsed.data,
      ip,
      userAgent,
    })

    return promotion
  })
}
