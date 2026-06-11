import { NextRequest } from "next/server"
import { SaleStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("relatorios.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const dateFilter =
      dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
            },
          }
        : {}

    const items = await prisma.saleItem.findMany({
      where: {
        sale: withTenant(tenantId, {
          status: { not: SaleStatus.CANCELADO },
          ...dateFilter,
        }),
      },
      include: {
        product: { select: { id: true, name: true, code: true, cost: true, price: true } },
        sale: { select: { total: true } },
      },
    })

    let revenue = 0
    let cmv = 0
    const byProduct: Record<
      string,
      { name: string; code: string; qty: number; revenue: number; cost: number; margin: number }
    > = {}

    for (const item of items) {
      const itemRevenue = Number(item.total)
      const itemCost = Number(item.product.cost ?? 0) * item.quantity
      revenue += itemRevenue
      cmv += itemCost

      const key = item.productId
      if (!byProduct[key]) {
        byProduct[key] = {
          name: item.product.name,
          code: item.product.code,
          qty: 0,
          revenue: 0,
          cost: 0,
          margin: 0,
        }
      }
      byProduct[key].qty += item.quantity
      byProduct[key].revenue += itemRevenue
      byProduct[key].cost += itemCost
    }

    const products = Object.values(byProduct).map((p) => ({
      ...p,
      margin: p.revenue - p.cost,
      marginPercent: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
    }))

    products.sort((a, b) => b.revenue - a.revenue)

    return {
      revenue,
      cmv,
      grossProfit: revenue - cmv,
      marginPercent: revenue > 0 ? ((revenue - cmv) / revenue) * 100 : 0,
      products,
    }
  })
}
