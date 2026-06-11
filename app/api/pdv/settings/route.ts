import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId } from "@/lib/prisma-tenant"
import { prisma } from "@/lib/prisma"
import { withApiHandler } from "@/lib/api-handler"

export async function GET() {
  return withApiHandler(async () => {
    const session = await requirePermission("pdv.vender")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const settings = await prisma.settings.findUnique({
      where: { tenantId },
      select: { serviceFee: true, kdsSlaMinutes: true, storeName: true, stoneEnabled: true },
    })

    return {
      serviceFee: Number(settings?.serviceFee ?? 0),
      kdsSlaMinutes: settings?.kdsSlaMinutes ?? 15,
      storeName: settings?.storeName ?? "PDV Galetos",
      stoneEnabled: settings?.stoneEnabled ?? false,
    }
  })
}
