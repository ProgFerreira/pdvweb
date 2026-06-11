import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { clienteSchema } from "@/schemas/cliente"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("clientes.ver")
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
          { phone: { contains: search } },
          { cpf: { contains: search } },
        ],
      }),
    })

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ])

    return { data: customers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("clientes.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = clienteSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const { ip, userAgent } = getRequestMeta(req)

    const customer = await prisma.customer.create({
      data: { tenantId, ...parsed.data },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "customer",
      resourceId: customer.id,
      newData: { name: customer.name },
      ip,
      userAgent,
    })

    return customer
  })
}
