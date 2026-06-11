import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyStoneWebhookSignature } from "@/lib/stone"
import { recordStockMovement } from "@/lib/stock-movement"
import { auditLog } from "@/lib/audit"

/**
 * Webhook Stone — recebe notificações de pagamento da maquininha.
 * Configure a URL no painel Stone: POST /api/stone/webhook
 * A assinatura HMAC-SHA256 é validada via STONE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-stone-signature") ?? ""

  if (!verifyStoneWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const transactionId = String(payload.id ?? "")
  const rawStatus = String(payload.status ?? "").toLowerCase()

  if (!transactionId) {
    return NextResponse.json({ error: "id ausente" }, { status: 400 })
  }

  const payment = await prisma.payment.findFirst({
    where: { stoneTransactionId: transactionId },
    include: {
      sale: {
        include: {
          items: true,
          cashRegister: true,
        },
      },
    },
  })

  if (!payment) {
    return NextResponse.json({ received: true })
  }

  const isApproved = ["approved", "authorized", "captured", "paid"].includes(rawStatus)
  const isFailed = ["declined", "refused", "failed", "cancelled", "timeout", "expired"].includes(rawStatus)

  const authCode = String(payload.authorization_code ?? payload.authCode ?? "")
  const nsu = String(payload.nsu ?? "")
  const installments = payload.installment_count ? Number(payload.installment_count) : undefined
  const capturedAt = payload.captured_at ? new Date(String(payload.captured_at)) : undefined

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      stoneStatus: rawStatus,
      stoneAuthCode: authCode || null,
      stoneNsu: nsu || null,
      stoneInstallments: installments,
      stoneCapturedAt: capturedAt,
    },
  })

  if (isApproved && payment.sale.status === "PAGAMENTO_PENDENTE") {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: payment.sale.id },
        data: { status: "AGUARDANDO" },
      })

      const cashPaymentMap: Record<string, string> = {
        DEBITO: "totalDebit",
        CREDITO: "totalCredit",
      }
      const cashField = cashPaymentMap[payment.method]
      if (cashField && payment.sale.cashRegisterId) {
        await tx.cashRegister.update({
          where: { id: payment.sale.cashRegisterId },
          data: {
            totalSales: { increment: Number(payment.sale.total) },
            [cashField]: { increment: Number(payment.amount) },
          },
        })
      }

      for (const item of payment.sale.items) {
        await recordStockMovement({
          tx,
          tenantId: payment.sale.tenantId,
          productId: item.productId,
          userId: payment.sale.userId,
          type: "VENDA",
          quantity: -item.quantity,
          referenceId: payment.sale.id,
          notes: `Venda #${payment.sale.orderNumber} (Stone confirmado)`,
        })
      }
    })

    await auditLog({
      tenantId: payment.sale.tenantId,
      userId: payment.sale.userId,
      action: "UPDATE",
      resource: "sale",
      resourceId: payment.sale.id,
      newData: { status: "AGUARDANDO", stoneTransactionId: transactionId, stoneStatus: rawStatus },
      ip: null,
      userAgent: "stone-webhook",
    })
  }

  if (isFailed && payment.sale.status === "PAGAMENTO_PENDENTE") {
    await prisma.sale.update({
      where: { id: payment.sale.id },
      data: { status: "CANCELADO", cancelReason: `Stone: ${rawStatus}` },
    })

    await auditLog({
      tenantId: payment.sale.tenantId,
      userId: payment.sale.userId,
      action: "UPDATE",
      resource: "sale",
      resourceId: payment.sale.id,
      newData: { status: "CANCELADO", stoneStatus: rawStatus },
      ip: null,
      userAgent: "stone-webhook",
    })
  }

  return NextResponse.json({ received: true })
}
