import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { clienteUpdateSchema } from "@/schemas/cliente"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
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
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { payments: true },
        },
      },
    })
    if (!customer) return apiError("Cliente não encontrado", 404)
    return customer
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("clientes.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = clienteUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.customer.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Cliente não encontrado", 404)

    const { ip, userAgent } = getRequestMeta(req)
    const customer = await prisma.customer.update({ where: { id }, data: parsed.data })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "customer",
      resourceId: id,
      oldData: { name: existing.name },
      newData: parsed.data,
      ip,
      userAgent,
    })

    return customer
  })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("clientes.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const existing = await prisma.customer.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Cliente não encontrado", 404)

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  })
}
