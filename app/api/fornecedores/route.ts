import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { fornecedorSchema } from "@/schemas/fornecedor"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("fornecedores.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const search = new URL(req.url).searchParams.get("search") ?? ""
    const page = parseInt(new URL(req.url).searchParams.get("page") ?? "1")
    const pageSize = parseInt(new URL(req.url).searchParams.get("pageSize") ?? "50")

    const where = withTenant(tenantId, {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { document: { contains: search } },
        ],
      }),
    })

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplier.count({ where }),
    ])

    return { data: suppliers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("fornecedores.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = fornecedorSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    return prisma.supplier.create({ data: { tenantId, ...parsed.data } })
  })
}
