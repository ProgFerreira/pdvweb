import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"
import { stoneCreateTransaction, stoneGetTransaction } from "@/lib/stone"

const createSchema = z.object({
  amount: z.number().int().min(1),
  paymentType: z.enum(["debit", "credit"]),
  installments: z.number().int().min(1).max(12).optional(),
  orderId: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("pdv.vender")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const settings = await prisma.settings.findUnique({ where: { tenantId } })
    if (
      !settings?.stoneEnabled ||
      !settings.stoneClientId ||
      !settings.stoneClientSecret ||
      !settings.stoneAccountId ||
      !settings.stoneTerminalSerial
    ) {
      return apiError("Integração Stone não configurada. Configure em Configurações.", 400)
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const transaction = await stoneCreateTransaction({
      amount: parsed.data.amount,
      paymentType: parsed.data.paymentType,
      installments: parsed.data.installments,
      terminalSerial: settings.stoneTerminalSerial,
      orderId: parsed.data.orderId,
      description: parsed.data.description ?? settings.storeName,
      clientId: settings.stoneClientId,
      clientSecret: settings.stoneClientSecret,
      accountId: settings.stoneAccountId,
    })

    return { transactionId: transaction.id, status: transaction.status }
  })
}

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("pdv.vender")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { searchParams } = new URL(req.url)
    const transactionId = searchParams.get("id")
    if (!transactionId) return apiError("id obrigatório", 400)

    const settings = await prisma.settings.findUnique({ where: { tenantId } })
    if (
      !settings?.stoneEnabled ||
      !settings.stoneClientId ||
      !settings.stoneClientSecret ||
      !settings.stoneAccountId
    ) {
      return apiError("Integração Stone não configurada", 400)
    }

    const transaction = await stoneGetTransaction(
      transactionId,
      settings.stoneClientId,
      settings.stoneClientSecret,
      settings.stoneAccountId
    )

    return transaction
  })
}
