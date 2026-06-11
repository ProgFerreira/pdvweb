import { CashStatus } from "@prisma/client"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"
import { prisma } from "@/lib/prisma"
import { withApiHandler } from "@/lib/api-handler"

export async function GET() {
  return withApiHandler(async () => {
    const session = await requirePermission("caixa.operar")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const cashRegister = await prisma.cashRegister.findFirst({
      where: withTenant(tenantId, { userId: session.user.id, status: CashStatus.ABERTO }),
      include: {
        movements: { orderBy: { createdAt: "desc" }, take: 20 },
        user: { select: { id: true, name: true } },
        _count: { select: { sales: true } },
      },
    })

    return cashRegister
  })
}
