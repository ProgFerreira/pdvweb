import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { pagarContaSchema } from "@/schemas/conta-pagar"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"
import type { PayableStatus } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("contas_pagar.pagar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)
    const { id } = await params

    const body = await req.json()
    const parsed = pagarContaSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.accountPayable.findFirst({
      where: withTenant(tenantId, { id, deletedAt: null }),
    })
    if (!existing) return apiError("Conta não encontrada", 404)
    if (existing.status === "PAGO" || existing.status === "CANCELADO") {
      return apiError("Esta conta já está quitada ou cancelada", 400)
    }

    const totalAmount = Number(existing.amount)
    const currentPaid = Number(existing.paidAmount)
    const remaining = totalAmount - currentPaid
    const payAmount = parsed.data.amount

    if (payAmount > remaining + 0.001) {
      return apiError(
        `Valor excede o saldo em aberto (${remaining.toFixed(2)})`,
        400
      )
    }

    const newPaid = currentPaid + payAmount
    let status: PayableStatus = "PARCIAL"
    let paidAt: Date | null = existing.paidAt

    if (newPaid >= totalAmount - 0.001) {
      status = "PAGO"
      paidAt = parsed.data.paidAt
        ? new Date(parsed.data.paidAt)
        : new Date()
    }

    return prisma.accountPayable.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        status,
        paidAt,
        paymentMethod: parsed.data.paymentMethod,
        notes: parsed.data.notes
          ? [existing.notes, parsed.data.notes].filter(Boolean).join("\n")
          : existing.notes,
      },
      include: { supplier: { select: { id: true, name: true } } },
    })
  })
}
