import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { verifyPrintToken } from "@/lib/print-token"
import { formatDateTime, formatCurrency } from "@/lib/utils"
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { PrintTrigger } from "@/components/print/print-trigger"

const PAYMENT_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  VALE: "Vale",
}

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO: "Aguardando preparo",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto para retirada",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { token } = await searchParams
  const session = await auth()

  // Só expõe metadados se o acesso for legítimo
  const hasSession = !!session?.user
  const hasToken = !!token

  if (!hasSession && !hasToken) return { title: "Pedido" }

  const sale = await prisma.sale.findUnique({
    where: { id },
    select: { orderNumber: true, tenantId: true },
  })
  if (!sale) return { title: "Pedido" }

  // Valida tenant quando usando sessão
  if (hasSession && session.user.tenantId && sale.tenantId !== session.user.tenantId) {
    return { title: "Pedido" }
  }

  return { title: `Pedido #${sale.orderNumber}` }
}

export default async function PrintPedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams

  const session = await auth()

  if (!session?.user && !token) {
    redirect("/login")
  }

  // Carrega a venda para obter o tenantId antes de validar o token
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true, code: true } } } },
      payments: true,
    },
  })

  if (!sale) notFound()

  // Com sessão: valida que o tenant bate
  if (session?.user) {
    if (session.user.tenantId && sale.tenantId !== session.user.tenantId) {
      notFound()
    }
  } else {
    // Sem sessão: valida token com tenantId embutido
    const tokenValid = token ? verifyPrintToken(id, sale.tenantId, token) : false
    if (!tokenValid) redirect("/login")
  }

  await prisma.sale.update({ where: { id }, data: { printedAt: new Date() } })

  const settings = await prisma.settings.findUnique({
    where: { tenantId: sale.tenantId },
  })

  const storeName = settings?.storeName ?? "PDV Galetos"

  return (
    <>
      <div className="center" style={{ marginBottom: "6px" }}>
        <p className="title">{storeName}</p>
        {settings?.phone && (
          <p style={{ fontSize: "10px", color: "#666" }}>{settings.phone}</p>
        )}
      </div>

      <div className="divider" />

      <div className="center" style={{ margin: "4px 0" }}>
        <p className="order-num">PEDIDO #{sale.orderNumber}</p>
        <p>{formatDateTime(sale.createdAt)}</p>
        <p className="bold">{STATUS_LABELS[sale.status] ?? sale.status}</p>
      </div>

      <div className="divider" />

      {(sale.customer || sale.customerName) && (
        <>
          <p>
            <span className="bold">Cliente:</span> {sale.customer?.name ?? sale.customerName}
          </p>
          {(sale.customer?.phone || sale.customerPhone) && (
            <p>
              <span className="bold">Tel:</span> {sale.customer?.phone ?? sale.customerPhone}
            </p>
          )}
          <div className="divider" />
        </>
      )}

      {sale.deliveryAddress && (
        <>
          <p className="bold">ENTREGA</p>
          <p>{sale.deliveryAddress}</p>
          {(sale.deliveryNeighborhood || sale.deliveryCity) && (
            <p>
              {[sale.deliveryNeighborhood, sale.deliveryCity].filter(Boolean).join(" — ")}
            </p>
          )}
          {sale.deliveryComplement && <p>Compl.: {sale.deliveryComplement}</p>}
          {sale.deliveryReference && <p>Ref.: {sale.deliveryReference}</p>}
          <div className="divider" />
        </>
      )}

      <p className="bold">ITENS</p>
      {sale.items.map((item) => (
        <div key={item.id} className="row">
          <span className="bold">
            {item.quantity}x {item.product.name}
          </span>
          <span>{formatCurrency(Number(item.total))}</span>
        </div>
      ))}

      <div className="divider" />

      <div className="row">
        <span>Subtotal</span>
        <span>{formatCurrency(Number(sale.subtotal))}</span>
      </div>
      {Number(sale.discount) > 0 && (
        <div className="row">
          <span>Desconto</span>
          <span>-{formatCurrency(Number(sale.discount))}</span>
        </div>
      )}
      <div className="row bold" style={{ fontSize: "14px", marginTop: "4px" }}>
        <span>TOTAL</span>
        <span>{formatCurrency(Number(sale.total))}</span>
      </div>

      <div className="divider" />

      <p className="bold">PAGAMENTO</p>
      {sale.payments.map((p) => (
        <div key={p.id} className="row">
          <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
          <span>{formatCurrency(Number(p.amount))}</span>
        </div>
      ))}

      {sale.notes && (
        <>
          <div className="divider" />
          <p>
            <span className="bold">Obs:</span> {sale.notes}
          </p>
        </>
      )}

      {settings?.printFooter && (
        <>
          <div className="divider" />
          <p className="center" style={{ fontSize: "10px" }}>
            {settings.printFooter}
          </p>
        </>
      )}

      <p className="center" style={{ marginTop: "8px", fontSize: "10px" }}>
        Atendente: {sale.user.name}
      </p>

      <PrintTrigger />
    </>
  )
}
