import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("auditoria.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const action = searchParams.get("action")
    const page = parseInt(searchParams.get("page") ?? "1")
    const pageSize = parseInt(searchParams.get("pageSize") ?? "30")

    const where = withTenant(tenantId, {
      ...(action && { action }),
      ...(from &&
        to && {
          createdAt: {
            gte: startOfDay(parseISO(from)),
            lte: endOfDay(parseISO(to)),
          },
        }),
    })

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { data: logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}
