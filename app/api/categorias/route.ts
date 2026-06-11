import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { categoriaSchema } from "@/schemas/categoria"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("produtos.ver")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const activeOnly = new URL(req.url).searchParams.get("activeOnly") !== "false"

    const categories = await prisma.category.findMany({
      where: withTenant(tenantId, activeOnly ? { isActive: true } : {}),
      orderBy: { name: "asc" },
    })
    return categories
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("categorias.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = categoriaSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const category = await prisma.category.create({
      data: { tenantId, ...parsed.data },
    })
    return category
  })
}
