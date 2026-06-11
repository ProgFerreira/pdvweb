import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { mesaSchema } from "@/schemas/mesa"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("mesas.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)
    const { id } = await params

    const body = await req.json()
    const parsed = mesaSchema.partial().safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.table.findFirst({
      where: withTenant(tenantId, { id }),
    })
    if (!existing) return apiError("Mesa não encontrada", 404)

    const table = await prisma.table.update({
      where: { id },
      data: parsed.data,
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "table",
      resourceId: id,
      oldData: existing,
      newData: parsed.data,
      ip,
      userAgent,
    })

    return table
  })
}
