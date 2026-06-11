import { NextRequest } from "next/server"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { prisma } from "@/lib/prisma"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"
import { z } from "zod"

const patchSchema = z.object({
  notes: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("caixa.operar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.cashRegister.findFirst({
      where: withTenant(tenantId, { id }),
    })
    if (!existing) return apiError("Caixa não encontrado", 404)

    const updated = await prisma.cashRegister.update({
      where: { id },
      data: { notes: parsed.data.notes ?? null },
      include: {
        user: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: "desc" } },
        _count: { select: { sales: true } },
      },
    })

    return updated
  })
}
