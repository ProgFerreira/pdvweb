import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { notaFiscalCompraSchema } from "@/schemas/nota-fiscal-compra"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

function parseIssueDate(value: string): Date {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error("Data de emissão inválida")
  return d
}

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("notas_fiscais.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const sp = new URL(req.url).searchParams
    const status = sp.get("status")
    const supplierId = sp.get("supplierId")
    const dateFrom = sp.get("dateFrom")
    const dateTo = sp.get("dateTo")
    const page = parseInt(sp.get("page") ?? "1")
    const pageSize = 50

    const where = withTenant(tenantId, {
      deletedAt: null,
      ...(status && status !== "TODOS" ? { status: status as "PENDENTE" | "PAGO" | "CANCELADO" } : {}),
      ...(supplierId && supplierId !== "TODOS" ? { supplierId } : {}),
      ...(dateFrom || dateTo
        ? {
            issueDate: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59`) } : {}),
            },
          }
        : {}),
    })

    const [invoices, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { issueDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseInvoice.count({ where }),
    ])

    return { data: invoices, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("notas_fiscais.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

    const body = await req.json()
    const parsed = notaFiscalCompraSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const { supplierId, number, issueDate, amount, status, paymentMethod, paymentDate, notes, fileUrl, fileMime } =
      parsed.data

    const supplier = await prisma.supplier.findFirst({
      where: withTenant(tenantId, { id: supplierId, deletedAt: null }),
    })
    if (!supplier) return apiError("Fornecedor não encontrado", 404)

    const finalStatus = status ?? "PENDENTE"
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        tenantId,
        supplierId,
        userId: session.user.id,
        number: number || null,
        issueDate: parseIssueDate(issueDate),
        amount,
        status: finalStatus,
        paymentMethod: finalStatus === "PAGO" ? paymentMethod ?? null : null,
        paymentDate:
          finalStatus === "PAGO" && paymentDate
            ? parseIssueDate(paymentDate)
            : finalStatus === "PAGO"
              ? new Date()
              : null,
        notes: notes || null,
        fileUrl: fileUrl || null,
        fileMime: fileMime || null,
      },
      include: { supplier: { select: { id: true, name: true, phone: true } } },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "purchase_invoice",
      resourceId: invoice.id,
      newData: { amount, status: invoice.status, supplierId },
      ip,
      userAgent,
    })

    return invoice
  })
}
