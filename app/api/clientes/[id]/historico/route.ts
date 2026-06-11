import { NextRequest } from "next/server"
import { SaleStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("clientes.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!customer) return apiError("Cliente não encontrado", 404)

    const notCancelled = { not: SaleStatus.CANCELADO }

    const [sales, stats, loyalty] = await Promise.all([
      prisma.sale.findMany({
        where: withTenant(tenantId, { customerId: id, status: notCancelled }),
        include: {
          items: { include: { product: { select: { id: true, name: true, code: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.sale.aggregate({
        where: withTenant(tenantId, { customerId: id, status: notCancelled }),
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
      }),
      prisma.loyaltyAccount.findUnique({ where: { customerId: id } }),
    ])

    return {
      sales,
      totalSpent: Number(stats._sum.total ?? 0),
      orderCount: stats._count,
      averageTicket: Number(stats._avg.total ?? 0),
      loyaltyPoints: loyalty?.points ?? 0,
    }
  })
}
