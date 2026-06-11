import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { categoriaUpdateSchema } from "@/schemas/categoria"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("categorias.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = categoriaUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.category.findFirst({
      where: withTenant(tenantId, { id }),
    })
    if (!existing) return apiError("Categoria não encontrada", 404)

    return prisma.category.update({ where: { id }, data: parsed.data })
  })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("categorias.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const existing = await prisma.category.findFirst({
      where: withTenant(tenantId, { id }),
    })
    if (!existing) return apiError("Categoria não encontrada", 404)

    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    })
    return { success: true }
  })
}
