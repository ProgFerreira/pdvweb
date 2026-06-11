import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { produtoUpdateSchema } from "@/schemas/produto"
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
    const session = await requirePermission("produtos.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const product = await prisma.product.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
      include: { category: true },
    })
    if (!product) return apiError("Produto não encontrado", 404)
    return product
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("produtos.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = produtoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.product.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Produto não encontrado", 404)

    const { ip, userAgent } = getRequestMeta(req)

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...parsed.data,
        imageUrl: parsed.data.imageUrl || null,
        supplierId: parsed.data.supplierId ?? undefined,
      },
      include: { category: true },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "product",
      resourceId: id,
      oldData: { name: existing.name, price: Number(existing.price), stock: existing.stock },
      newData: parsed.data,
      ip,
      userAgent,
    })

    return product
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("produtos.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const existing = await prisma.product.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Produto não encontrado", 404)

    const { ip, userAgent } = getRequestMeta(req)

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "DELETE",
      resource: "product",
      resourceId: id,
      oldData: { name: existing.name, code: existing.code },
      ip,
      userAgent,
    })

    return { success: true }
  })
}
