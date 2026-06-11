import { NextRequest } from "next/server"
import { CashStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { abrirCaixaSchema } from "@/schemas/caixa"
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

    const existing = await prisma.cashRegister.findFirst({
      where: withTenant(tenantId, { userId: session.user.id, status: CashStatus.ABERTO }),
    })
    if (existing) {
      return apiError("Você já possui um caixa aberto", 409)
    }

    const body = await req.json()
    const parsed = abrirCaixaSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const cashRegister = await prisma.cashRegister.create({
      data: {
        tenantId,
        userId: session.user.id,
        initialAmount: parsed.data.initialAmount,
        notes: parsed.data.notes,
      },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "OPEN",
      resource: "cash_register",
      resourceId: cashRegister.id,
    })

    return cashRegister
  })
}
