import { NextRequest } from "next/server"
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
    const status = searchParams.get("status")

    const where = withTenant(tenantId, {
      ...(from && { createdAt: { gte: startOfDay(parseISO(from)) } }),
      ...(to && {
        createdAt: {
          ...(from ? { gte: startOfDay(parseISO(from)) } : {}),
          lte: endOfDay(parseISO(to)),
        },
      }),
      ...(status && { status: status as never }),
    })

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        payments: true,
        items: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    return sales
  })
}
