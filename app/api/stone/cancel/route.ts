import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId } from "@/lib/prisma-tenant"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"
import { stoneCancelTransaction } from "@/lib/stone"

const schema = z.object({ transactionId: z.string().min(1) })

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("pdv.vender")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError("transactionId obrigatório", 400)

    const settings = await prisma.settings.findUnique({ where: { tenantId } })
    if (
      !settings?.stoneEnabled ||
      !settings.stoneClientId ||
      !settings.stoneClientSecret ||
      !settings.stoneAccountId
    ) {
      return apiError("Integração Stone não configurada", 400)
    }

    await stoneCancelTransaction(
      parsed.data.transactionId,
      settings.stoneClientId,
      settings.stoneClientSecret,
      settings.stoneAccountId
    )

    return { ok: true }
  })
}
