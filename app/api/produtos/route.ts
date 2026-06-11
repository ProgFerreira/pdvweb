import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { produtoSchema } from "@/schemas/produto"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("produtos.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") ?? ""
    const categoryId = searchParams.get("categoryId") ?? ""
    const isActive = searchParams.get("isActive")
    const page = parseInt(searchParams.get("page") ?? "1")
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50")

    const where = withTenant(tenantId, {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { barcode: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(isActive !== null && isActive !== "" && { isActive: isActive === "true" }),
    })

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    return { data: products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("produtos.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = produtoSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.product.findFirst({
      where: { tenantId, code: parsed.data.code, deletedAt: null },
    })
    if (existing) {
      return apiError("Já existe um produto com este código", 409)
    }

    const { ip, userAgent } = getRequestMeta(req)

    const product = await prisma.product.create({
      data: {
        tenantId,
        ...parsed.data,
        imageUrl: parsed.data.imageUrl || null,
        supplierId: parsed.data.supplierId || null,
      },
      include: { category: true },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resource: "product",
      resourceId: product.id,
      newData: { code: product.code, name: product.name, price: Number(product.price) },
      ip,
      userAgent,
    })

    return product
  })
}
