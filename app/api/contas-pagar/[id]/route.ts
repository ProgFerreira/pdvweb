import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { contaPagarUpdateSchema } from "@/schemas/conta-pagar"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("contas_pagar.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const item = await prisma.accountPayable.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
      include: { supplier: { select: { id: true, name: true } } },
    })
    if (!item) return apiError("Conta não encontrada", 404)
    return item
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("contas_pagar.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = contaPagarUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.accountPayable.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Conta não encontrada", 404)
    if (existing.status === "PAGO" || existing.status === "CANCELADO") {
      return apiError("Conta quitada ou cancelada não pode ser editada", 400)
    }

    const { dueDate, supplierId, purchaseOrderId, ...rest } = parsed.data

    return prisma.accountPayable.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(supplierId !== undefined && {
          supplierId: supplierId || null,
        }),
        ...(purchaseOrderId !== undefined && {
          purchaseOrderId: purchaseOrderId || null,
        }),
      },
      include: { supplier: { select: { id: true, name: true } } },
    })
  })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("contas_pagar.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const existing = await prisma.accountPayable.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Conta não encontrada", 404)

    await prisma.accountPayable.update({
      where: { id },
      data: { deletedAt: new Date(), status: "CANCELADO" },
    })
    return { success: true }
  })
}
