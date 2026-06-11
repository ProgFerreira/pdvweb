import { NextRequest } from "next/server"
import { CashStatus, type Prisma } from "@prisma/client"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { prisma } from "@/lib/prisma"
import { withApiHandler } from "@/lib/api-handler"

function parseDateStart(value: string) {
  return new Date(`${value}T00:00:00`)
}

function parseDateEnd(value: string) {
  return new Date(`${value}T23:59:59.999`)
}

function buildWhere(
  tenantId: string,
  params: { status?: string | null; userId?: string | null; dateFrom?: string | null; dateTo?: string | null }
): Prisma.CashRegisterWhereInput {
  const where = withTenant(tenantId, {}) as Prisma.CashRegisterWhereInput

  if (params.status && params.status !== "all") {
    where.status = params.status as CashStatus
  }
  if (params.userId && params.userId !== "all") {
    where.userId = params.userId
  }
  if (params.dateFrom || params.dateTo) {
    where.openedAt = {}
    if (params.dateFrom) {
      where.openedAt.gte = parseDateStart(params.dateFrom)
    }
    if (params.dateTo) {
      where.openedAt.lte = parseDateEnd(params.dateTo)
    }
  }

  return where
}

async function computeStats(where: Prisma.CashRegisterWhereInput) {
  const rows = await prisma.cashRegister.findMany({
    where,
    select: {
      status: true,
      totalSales: true,
      initialAmount: true,
      totalCash: true,
    },
  })

  let totalVendas = 0
  let saldoTotal = 0
  let abertos = 0
  let fechados = 0

  for (const row of rows) {
    totalVendas += Number(row.totalSales)
    saldoTotal += Number(row.initialAmount) + Number(row.totalCash)
    if (row.status === CashStatus.ABERTO) abertos++
    else fechados++
  }

  return {
    totalCaixas: rows.length,
    abertos,
    fechados,
    totalVendas,
    saldoTotal,
  }
}

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("caixa.operar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") ?? "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10)
    const status = searchParams.get("status")
    const userId = searchParams.get("userId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where = buildWhere(tenantId, { status, userId, dateFrom, dateTo })

    const [registers, total, stats, operatorRows] = await Promise.all([
      prisma.cashRegister.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          movements: { orderBy: { createdAt: "desc" } },
          _count: { select: { sales: true } },
        },
        orderBy: { openedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cashRegister.count({ where }),
      computeStats(where),
      prisma.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
          cashRegisters: { some: {} },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ])

    const operators = operatorRows

    return {
      data: registers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats,
      operators,
    }
  })
}
