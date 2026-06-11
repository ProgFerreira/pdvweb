import { NextRequest } from "next/server"
import { SaleStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("relatorios.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const dateFilter =
      from && to
        ? {
            gte: startOfDay(parseISO(from)),
            lte: endOfDay(parseISO(to)),
          }
        : undefined

    const items = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: withTenant(tenantId, {
          status: { not: SaleStatus.CANCELADO },
          ...(dateFilter && { createdAt: dateFilter }),
        }),
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
    })

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, tenantId },
      select: { id: true, name: true, code: true, cost: true },
    })

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      const revenue = Number(item._sum.total ?? 0)
      const cost = Number(product?.cost ?? 0) * (item._sum.quantity ?? 0)
      return {
        productId: item.productId,
        name: product?.name ?? "Desconhecido",
        code: product?.code ?? "",
        quantity: item._sum.quantity ?? 0,
        revenue,
        cost,
        profit: revenue - cost,
      }
    })
  })
}
