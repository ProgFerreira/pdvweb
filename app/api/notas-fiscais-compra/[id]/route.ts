import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { notaFiscalCompraUpdateSchema } from "@/schemas/nota-fiscal-compra"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

function parseDate(value: string): Date {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error("Data inválida")
  return d
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("notas_fiscais.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
      include: { supplier: { select: { id: true, name: true, phone: true, document: true, email: true } } },
    })
    if (!invoice) return apiError("Nota fiscal não encontrada", 404)
    return invoice
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("notas_fiscais.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params
    const { ip, userAgent } = getRequestMeta(req)

    const existing = await prisma.purchaseInvoice.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Nota fiscal não encontrada", 404)

    const body = await req.json()
    const parsed = notaFiscalCompraUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const data = parsed.data
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: withTenant(tenantId, { id: data.supplierId, deletedAt: null }),
      })
      if (!supplier) return apiError("Fornecedor não encontrado", 404)
    }

    const status = data.status ?? existing.status
    const updateData: Record<string, unknown> = {}

    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId
    if (data.number !== undefined) updateData.number = data.number || null
    if (data.issueDate !== undefined) updateData.issueDate = parseDate(data.issueDate)
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl
    if (data.fileMime !== undefined) updateData.fileMime = data.fileMime

    if (status === "PAGO") {
      updateData.paymentMethod = data.paymentMethod ?? existing.paymentMethod
      updateData.paymentDate = data.paymentDate
        ? parseDate(data.paymentDate)
        : existing.paymentDate ?? new Date()
    } else {
      updateData.paymentMethod = null
      updateData.paymentDate = null
    }

    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data: updateData,
      include: { supplier: { select: { id: true, name: true, phone: true } } },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "purchase_invoice",
      resourceId: id,
      oldData: { status: existing.status, amount: existing.amount },
      newData: { status: invoice.status, amount: invoice.amount },
      ip,
      userAgent,
    })

    return invoice
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("notas_fiscais.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params
    const { ip, userAgent } = getRequestMeta(req)

    const existing = await prisma.purchaseInvoice.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Nota fiscal não encontrada", 404)

    await prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "DELETE",
      resource: "purchase_invoice",
      resourceId: id,
      ip,
      userAgent,
    })

    return { success: true }
  })
}
