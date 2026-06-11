import { NextRequest } from "next/server"
import { createPrintToken } from "@/lib/print-token"
import { requirePermission, isSession } from "@/lib/api-auth"
import { apiError } from "@/lib/utils"
import { withApiHandler } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { getTenantId, withTenant } from "@/lib/prisma-tenant"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const session = await requirePermission("fila.gerir")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const { id } = await params

    // Garante que a venda pertence ao tenant do operador logado
    const sale = await prisma.sale.findFirst({
      where: withTenant(tenantId, { id }),
      select: { id: true },
    })
    if (!sale) return apiError("Pedido não encontrado", 404)

    const token = createPrintToken(id, tenantId)
    return { token, url: `/print/pedido/${id}?token=${token}` }
  })
}
