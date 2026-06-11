import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { usuarioUpdateSchema } from "@/schemas/usuario"
import bcrypt from "bcryptjs"
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
    const session = await requirePermission("usuarios.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = usuarioUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.user.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Usuário não encontrado", 404)

    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.password) {
      updateData.password = await bcrypt.hash(parsed.data.password, 12)
    } else {
      delete updateData.password
    }

    const { ip, userAgent } = getRequestMeta(req)

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "user",
      resourceId: id,
      oldData: { name: existing.name, role: existing.role },
      newData: { name: user.name, role: user.role },
      ip,
      userAgent,
    })

    return user
  })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("usuarios.excluir")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    if (id === session.user.id) {
      return apiError("Não pode remover seu próprio usuário", 400)
    }

    const existing = await prisma.user.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Usuário não encontrado", 404)

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
    return { success: true }
  })
}
