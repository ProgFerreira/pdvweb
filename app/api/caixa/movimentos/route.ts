import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { movimentoCaixaSchema } from "@/schemas/caixa"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("caixa.operar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = movimentoCaixaSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const { cashRegisterId } = body
    if (!cashRegisterId) {
      return apiError("cashRegisterId obrigatório", 400)
    }

    const cashRegister = await prisma.cashRegister.findFirst({
      where: withTenant(tenantId, { id: cashRegisterId }),
    })

    if (!cashRegister || cashRegister.status !== "ABERTO") {
      return apiError("Caixa não encontrado ou fechado", 400)
    }
    if (cashRegister.userId !== session.user.id) {
      return apiError("Não autorizado a movimentar este caixa", 403)
    }

    const [movement] = await prisma.$transaction([
      prisma.cashMovement.create({
        data: {
          cashRegisterId,
          type: parsed.data.type,
          amount: parsed.data.amount,
          description: parsed.data.description,
        },
      }),
      prisma.cashRegister.update({
        where: { id: cashRegisterId },
        data:
          parsed.data.type === "ENTRADA"
            ? { totalCash: { increment: parsed.data.amount } }
            : { totalCash: { decrement: parsed.data.amount } },
      }),
    ])

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: parsed.data.type,
      resource: "cash_movement",
      resourceId: movement.id,
      newData: { amount: parsed.data.amount, description: parsed.data.description },
    })

    return movement
  })
}
