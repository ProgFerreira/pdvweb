import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { mesaSchema } from "@/schemas/mesa"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET() {
  return withApiHandler(async () => {
    const session = await requirePermission("mesas.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const tables = await prisma.table.findMany({
      where: withTenant(tenantId, { isActive: true }),
      orderBy: { number: "asc" },
    })
    return { data: tables }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("mesas.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

    const body = await req.json()
    const parsed = mesaSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const exists = await prisma.table.findFirst({
      where: { tenantId, number: parsed.data.number },
    })
    if (exists) return apiError("Já existe mesa com este número", 409)

    const table = await prisma.table.create({
      data: { tenantId, ...parsed.data },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "table",
      resourceId: table.id,
      newData: parsed.data,
      ip,
      userAgent,
    })

    return table
  })
}
