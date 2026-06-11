"use client"

import { useEffect, useState, useCallback } from "react"
import { formatDateTime, formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFilaNotifications } from "@/hooks/use-fila-notifications"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Printer, RefreshCw, ChefHat, CheckCircle, Clock, Truck, XCircle } from "lucide-react"
import type { SaleWithRelations } from "@/types"

type SaleStatus = "AGUARDANDO" | "EM_PREPARO" | "PRONTO" | "ENTREGUE" | "CANCELADO"

const STATUS_CONFIG: Record<SaleStatus, { label: string; color: string; badge: string; icon: React.ElementType }> = {
  AGUARDANDO: { label: "Aguardando", color: "border-amber-300 bg-amber-50", badge: "warning", icon: Clock },
  EM_PREPARO: { label: "Em Preparo", color: "border-blue-300 bg-blue-50", badge: "info", icon: ChefHat },
  PRONTO: { label: "Pronto", color: "border-green-300 bg-green-50", badge: "success", icon: CheckCircle },
  ENTREGUE: { label: "Entregue", color: "border-gray-300 bg-gray-50", badge: "secondary", icon: Truck },
  CANCELADO: { label: "Cancelado", color: "border-red-300 bg-red-50", badge: "destructive", icon: XCircle },
}

const NEXT_STATUS: Partial<Record<SaleStatus, SaleStatus>> = {
  AGUARDANDO: "EM_PREPARO",
  EM_PREPARO: "PRONTO",
  PRONTO: "ENTREGUE",
}

const ACTIVE_STATUSES: SaleStatus[] = ["AGUARDANDO", "EM_PREPARO", "PRONTO"]

function getElapsedMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

export default function FilaPage() {
  const { toast } = useToast()
  useFilaNotifications(true)
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelDialog, setCancelDialog] = useState<{ id: string; number: number } | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [slaMinutes, setSlaMinutes] = useState(15)

  const load = useCallback(async () => {
    const res = await fetch("/api/vendas?status=AGUARDANDO&status=EM_PREPARO&status=PRONTO&pageSize=50")
    const data = await res.json()
    const all = data.data ?? []
    setSales(all.filter((s: SaleWithRelations) => ACTIVE_STATUSES.includes(s.status as SaleStatus)))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/pdv/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d?.data ?? d
        if (s?.kdsSlaMinutes) setSlaMinutes(s.kdsSlaMinutes)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const updateStatus = async (id: string, status: SaleStatus, cancelReason?: string) => {
    setUpdatingId(id)
    const res = await fetch(`/api/vendas/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, cancelReason }),
    })
    setUpdatingId(null)
    if (res.ok) {
      const updated: SaleWithRelations = await res.json()
      setSales((prev) => {
        if (!ACTIVE_STATUSES.includes(updated.status as SaleStatus)) {
          return prev.filter((s) => s.id !== id)
        }
        return prev.map((s) => (s.id === id ? { ...s, ...updated, status: updated.status } : s))
      })
      toast({ title: `Pedido ${STATUS_CONFIG[status].label.toLowerCase()}!` })
    } else {
      toast({ title: "Erro ao atualizar pedido", variant: "destructive" })
      load()
    }
  }

  const byStatus = (status: SaleStatus) => sales.filter((s) => s.status === status)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fila de Pedidos</h1>
          <p className="text-gray-500 text-sm">Atualiza automaticamente a cada 15 segundos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/painel", "_blank")}>
            Abrir Painel TV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {ACTIVE_STATUSES.map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const items = byStatus(status)

          return (
            <div key={status} className="space-y-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${config.color}`}>
                <Icon className="w-5 h-5" />
                <span className="font-semibold">{config.label}</span>
                <span className="ml-auto bg-white rounded-full px-2 py-0.5 text-sm font-bold">{items.length}</span>
              </div>

              {items.length === 0 ? (
                <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                  Nenhum pedido
                </div>
              ) : (
                items.map((sale) => {
                  const nextStatus = NEXT_STATUS[status as SaleStatus]
                  const elapsed = getElapsedMinutes(String(sale.createdAt))
                  const isLate = elapsed >= slaMinutes && (status === "AGUARDANDO" || status === "EM_PREPARO")
                  return (
                    <Card key={sale.id} className={`border-2 ${isLate ? "border-red-500 bg-red-50 animate-pulse" : config.color}`}>
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg">#{sale.orderNumber}</span>
                          <span className={`text-xs font-medium ${isLate ? "text-red-600" : "text-gray-500"}`}>
                            {elapsed} min {isLate && "· Atrasado"}
                          </span>
                        </div>
                        {(sale.customer || sale.customerName) && (
                          <p className="text-sm text-gray-600">
                            {sale.customer?.name ?? sale.customerName}
                            {sale.customerPhone && !sale.customer?.phone && (
                              <span className="text-gray-400"> · {sale.customerPhone}</span>
                            )}
                          </p>
                        )}
                        {sale.deliveryAddress && (
                          <p className="text-xs text-gray-500 truncate" title={sale.deliveryAddress}>
                            📍 {sale.deliveryAddress}
                            {sale.deliveryNeighborhood ? `, ${sale.deliveryNeighborhood}` : ""}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2">
                        <div className="space-y-1">
                          {sale.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-700">
                                <span className="font-semibold text-gray-900">{item.quantity}x</span> {item.product.name}
                                {item.notes && <span className="text-xs text-orange-600 block ml-4">↳ {item.notes}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                        {sale.notes && (
                          <p className="text-xs text-gray-500 italic border-t pt-1">Obs: {sale.notes}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          {nextStatus && (
                            <Button
                              size="sm"
                              className="flex-1"
                              variant={nextStatus === "PRONTO" ? "success" : "default"}
                              disabled={updatingId === sale.id}
                              onClick={() => updateStatus(sale.id, nextStatus)}
                            >
                              {STATUS_CONFIG[nextStatus].label}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => import("@/lib/open-print").then((m) => m.openPrintWindow(sale.id))}
                          >
                            <Printer className="w-3 h-3" />
                          </Button>
                          {status !== "PRONTO" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-red-500"
                              onClick={() => setCancelDialog({ id: sale.id, number: sale.orderNumber })}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar Pedido #{cancelDialog?.number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-600 text-sm">Informe o motivo do cancelamento:</p>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" placeholder="Motivo do cancelamento..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Voltar</Button>
            <Button variant="destructive" onClick={() => { if (cancelDialog) updateStatus(cancelDialog.id, "CANCELADO", cancelReason); setCancelDialog(null) }}>
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
