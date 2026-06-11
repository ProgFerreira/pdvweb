import type { Prisma, StockMovementType } from "@prisma/client"

type RecordStockMovementParams = {
  tx: Prisma.TransactionClient
  tenantId: string
  productId: string
  userId?: string | null
  type: StockMovementType
  quantity: number
  referenceId?: string | null
  notes?: string | null
}

export async function recordStockMovement(params: RecordStockMovementParams) {
  const product = await params.tx.product.findUniqueOrThrow({
    where: { id: params.productId },
    select: { stock: true },
  })

  const stockBefore = product.stock
  const stockAfter = stockBefore + params.quantity

  await params.tx.product.update({
    where: { id: params.productId },
    data: { stock: stockAfter },
  })

  await params.tx.stockMovement.create({
    data: {
      tenantId: params.tenantId,
      productId: params.productId,
      userId: params.userId ?? null,
      type: params.type,
      quantity: params.quantity,
      stockBefore,
      stockAfter,
      referenceId: params.referenceId ?? null,
      notes: params.notes ?? null,
    },
  })

  return { stockBefore, stockAfter }
}

export type { StockMovementType }
