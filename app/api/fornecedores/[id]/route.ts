import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { fornecedorUpdateSchema } from "@/schemas/fornecedor"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("fornecedores.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const supplier = await prisma.supplier.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!supplier) return apiError("Fornecedor não encontrado", 404)
    return supplier
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("fornecedores.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = fornecedorUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.supplier.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Fornecedor não encontrado", 404)

    return prisma.supplier.update({ where: { id }, data: parsed.data })
  })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("fornecedores.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const existing = await prisma.supplier.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Fornecedor não encontrado", 404)

    await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  })
}
