import { NextRequest } from "next/server"
import { CashStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { fecharCaixaSchema } from "@/schemas/caixa"
import { requirePermission, isSession } from "@/lib/api-auth"
import { hasPermission } from "@/lib/permissions"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("caixa.operar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { ip, userAgent } = getRequestMeta(req)

    const body = await req.json()
    const parsed = fecharCaixaSchema.safeParse(body)
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

    if (!cashRegister) return apiError("Caixa não encontrado", 404)
    const canCloseAny =
      hasPermission(session.user.role, "configuracoes.editar") ||
      hasPermission(session.user.role, "usuarios.crud")
    if (cashRegister.userId !== session.user.id && !canCloseAny) {
      return apiError("Não autorizado a fechar este caixa", 403)
    }
    if (cashRegister.status === CashStatus.FECHADO) {
      return apiError("Caixa já está fechado", 400)
    }

    const expectedCash =
      Number(cashRegister.initialAmount) + Number(cashRegister.totalCash)
    const countedCash = parsed.data.countedCash
    const cashDifference = countedCash - expectedCash

    const closed = await prisma.cashRegister.update({
      where: { id: cashRegisterId },
      data: {
        status: CashStatus.FECHADO,
        closedAt: new Date(),
        countedCash,
        cashDifference,
        closeNotes: parsed.data.closeNotes ?? null,
        notes: parsed.data.notes || cashRegister.notes,
      },
      include: {
        user: { select: { id: true, name: true } },
        movements: true,
      },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "CLOSE",
      resource: "cash_register",
      resourceId: cashRegisterId,
      newData: { countedCash, cashDifference, expectedCash },
      ip,
      userAgent,
    })

    return closed
  })
}
