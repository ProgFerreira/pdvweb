import { prisma } from "@/lib/prisma"

export async function getNextOrderNumber(tenantId: string): Promise<number> {
  const last = await prisma.sale.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })
  return (last?.orderNumber ?? 0) + 1
}
