import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId } from "@/lib/prisma-tenant"
import { auditLog } from "@/lib/audit"
import { getRequestMeta } from "@/lib/audit-request"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

const settingsSchema = z.object({
  storeName: z.string().min(1).optional(),
  logoUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  serviceFee: z.coerce.number().min(0).max(100).optional(),
  kdsSlaMinutes: z.coerce.number().int().min(1).max(120).optional(),
  printFooter: z.string().optional().nullable(),
  openHours: z.string().optional().nullable(),
  stoneEnabled: z.boolean().optional(),
  stoneAccountId: z.string().optional().nullable(),
  stoneClientId: z.string().optional().nullable(),
  stoneClientSecret: z.string().optional().nullable(),
  stoneTerminalSerial: z.string().optional().nullable(),
})

export async function GET() {
  return withApiHandler(async () => {
    const session = await requirePermission("configuracoes.editar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    let settings = await prisma.settings.findUnique({ where: { tenantId } })
    if (!settings) {
      settings = await prisma.settings.create({
        data: { tenantId, storeName: "PDV Galetos" },
      })
    }
    return settings
  })
}

export async function PATCH(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("configuracoes.editar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const body = await req.json()
    const parsed = settingsSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten()), 400)
    }

    const existing = await prisma.settings.findUnique({ where: { tenantId } })
    const { ip, userAgent } = getRequestMeta(req)

    const settings = await prisma.settings.upsert({
      where: { tenantId },
      update: parsed.data,
      create: { tenantId, storeName: parsed.data.storeName ?? "PDV Galetos", ...parsed.data },
    })

    await auditLog({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resource: "settings",
      resourceId: settings.id,
      oldData: existing ?? undefined,
      newData: parsed.data,
      ip,
      userAgent,
    })

    return settings
  })
}
