import { SaleStatus } from "@prisma/client"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { prisma } from "@/lib/prisma"
import { withApiHandler } from "@/lib/api-handler"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export async function GET() {
  return withApiHandler(async () => {
    const session = await requirePermission("dashboard.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const today = new Date()
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)
    const yesterdayStart = startOfDay(subDays(today, 1))
    const yesterdayEnd = endOfDay(subDays(today, 1))
    const notCancelled = { not: SaleStatus.CANCELADO }

    const [
      salesToday,
      salesYesterday,
      allTodaySales,
      salesLast7Days,
      topProducts,
      lowStockProducts,
      salesByOperator,
      salesByHour,
    ] = await Promise.all([
      prisma.sale.findMany({
        where: withTenant(tenantId, {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: notCancelled,
        }),
        include: { payments: true },
      }),
      prisma.sale.aggregate({
        where: withTenant(tenantId, {
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          status: notCancelled,
        }),
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.findMany({
        where: withTenant(tenantId, {
          createdAt: { gte: dayStart, lte: dayEnd },
        }),
        select: { status: true, createdAt: true, total: true, userId: true },
      }),
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const date = subDays(today, 6 - i)
          return prisma.sale
            .aggregate({
              where: withTenant(tenantId, {
                createdAt: { gte: startOfDay(date), lte: endOfDay(date) },
                status: notCancelled,
              }),
              _sum: { total: true },
              _count: true,
            })
            .then((r) => ({
              date: format(date, "dd/MM"),
              total: Number(r._sum.total ?? 0),
              orders: r._count,
            }))
        })
      ),
      prisma.saleItem
        .groupBy({
          by: ["productId"],
          where: {
            sale: withTenant(tenantId, {
              createdAt: { gte: dayStart, lte: dayEnd },
              status: notCancelled,
            }),
          },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { total: "desc" } },
          take: 5,
        })
        .then(async (items) => {
          const products = await prisma.product.findMany({
            where: { id: { in: items.map((i) => i.productId) }, tenantId },
            select: { id: true, name: true },
          })
          return items.map((item) => ({
            name: products.find((p) => p.id === item.productId)?.name ?? "Desconhecido",
            quantity: item._sum.quantity ?? 0,
            total: Number(item._sum.total ?? 0),
          }))
        }),
      prisma.product
        .findMany({
          where: withTenant(tenantId, { deletedAt: null, isActive: true }),
          select: {
            id: true,
            name: true,
            code: true,
            stock: true,
            minStock: true,
            supplierId: true,
          },
        })
        .then((products) => products.filter((p) => p.stock <= p.minStock)),
      prisma.sale.groupBy({
        by: ["userId"],
        where: withTenant(tenantId, {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: notCancelled,
        }),
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: "desc" } },
      }),
      prisma.sale.findMany({
        where: withTenant(tenantId, {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: notCancelled,
        }),
        select: { createdAt: true, total: true },
      }),
    ])

    const totalSold = salesToday.reduce((acc, s) => acc + Number(s.total), 0)
    const totalOrders = salesToday.length
    const averageTicket = totalOrders > 0 ? totalSold / totalOrders : 0

    const statusCounts = allTodaySales.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const cancelledToday = statusCounts.CANCELADO ?? 0
    const totalTodayAll = allTodaySales.length
    const cancellationRate =
      totalTodayAll > 0 ? (cancelledToday / totalTodayAll) * 100 : 0

    const salesByPaymentMethod = Object.entries(
      salesToday.flatMap((s) => s.payments).reduce(
        (acc, p) => {
          acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount)
          return acc
        },
        {} as Record<string, number>
      )
    ).map(([method, total]) => ({ method, total }))

    const hourMap: Record<number, number> = {}
    for (let h = 0; h < 24; h++) hourMap[h] = 0
    for (const s of salesByHour) {
      const h = new Date(s.createdAt).getHours()
      hourMap[h] = (hourMap[h] ?? 0) + Number(s.total)
    }
    const salesByHourOfDay = Object.entries(hourMap).map(([hour, total]) => ({
      hour: `${hour}h`,
      total,
    }))

    const users = await prisma.user.findMany({
      where: { tenantId, id: { in: salesByOperator.map((o) => o.userId) } },
      select: { id: true, name: true },
    })

    const operatorRanking = salesByOperator.map((o) => {
      const total = Number(o._sum.total ?? 0)
      const orders = o._count
      return {
        name: users.find((u) => u.id === o.userId)?.name ?? "Desconhecido",
        orders,
        total,
        averageTicket: orders > 0 ? total / orders : 0,
      }
    })

    const yesterdayTotal = Number(salesYesterday._sum.total ?? 0)
    const salesGrowthPercent =
      yesterdayTotal > 0 ? ((totalSold - yesterdayTotal) / yesterdayTotal) * 100 : 0

    return {
      totalSoldToday: totalSold,
      totalOrdersToday: totalOrders,
      averageTicket,
      openOrders: statusCounts.AGUARDANDO ?? 0,
      preparingOrders: statusCounts.EM_PREPARO ?? 0,
      readyOrders: statusCounts.PRONTO ?? 0,
      cancelledOrders: cancelledToday,
      cancellationRate,
      yesterdayTotal,
      salesGrowthPercent,
      salesByPaymentMethod,
      topProducts,
      salesLast7Days,
      lowStockProducts,
      salesByHourOfDay,
      operatorRanking,
    }
  })
}
