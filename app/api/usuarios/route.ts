import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { usuarioSchema } from "@/schemas/usuario"
import bcrypt from "bcryptjs"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function GET() {
  return withApiHandler(async () => {
    const session = await requirePermission("usuarios.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const users = await prisma.user.findMany({
      where: withTenant(tenantId, { deletedAt: null }),
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" },
    })
    return users
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("usuarios.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = usuarioSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.user.findFirst({
      where: { tenantId, email: parsed.data.email },
    })
    if (existing) return apiError("E-mail já cadastrado", 409)

    const hashed = await bcrypt.hash(parsed.data.password, 12)
    const user = await prisma.user.create({
      data: { tenantId, ...parsed.data, password: hashed },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })
    return user
  })
}
