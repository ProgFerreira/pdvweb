import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { contaPagarSchema } from "@/schemas/conta-pagar"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"
import type { PayableStatus, Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("contas_pagar.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const params = new URL(req.url).searchParams
    const search = params.get("search") ?? ""
    const status = params.get("status") as PayableStatus | "VENCIDO" | null
    const category = params.get("category")
    const page = parseInt(params.get("page") ?? "1")
    const pageSize = parseInt(params.get("pageSize") ?? "50")

    const baseWhere = withTenant(tenantId, {
      deletedAt: null,
      ...(search && {
        OR: [
          { description: { contains: search } },
          { supplier: { name: { contains: search } } },
        ],
      }),
      ...(category && { category: category as never }),
      ...(status && status !== "VENCIDO" && { status }),
    })

    let where: Prisma.AccountPayableWhereInput = baseWhere
    if (status === "VENCIDO") {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      where = {
        ...baseWhere,
        status: { in: ["PENDENTE", "PARCIAL"] as PayableStatus[] },
        dueDate: { lt: today },
      }
    }

    const [items, total] = await Promise.all([
      prisma.accountPayable.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.accountPayable.count({ where }),
    ])

    const pending = await prisma.accountPayable.aggregate({
      where: withTenant(tenantId, {
        deletedAt: null,
        status: { in: ["PENDENTE", "PARCIAL"] as PayableStatus[] },
      }),
      _sum: { amount: true, paidAmount: true },
      _count: true,
    })

    const openAmount =
      Number(pending._sum?.amount ?? 0) - Number(pending._sum?.paidAmount ?? 0)

    return {
      data: items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: {
        openCount: pending._count,
        openAmount,
      },
    }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("contas_pagar.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = contaPagarSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const { supplierId, purchaseOrderId, dueDate, ...rest } = parsed.data

    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: withTenant(tenantId, { id: supplierId, deletedAt: null }),
      })
      if (!supplier) return apiError("Fornecedor não encontrado", 404)
    }

    return prisma.accountPayable.create({
      data: {
        tenantId,
        ...rest,
        dueDate: new Date(dueDate),
        supplierId: supplierId || null,
        purchaseOrderId: purchaseOrderId || null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    })
  })
}
