"use client"

import { useEffect, useState, useCallback } from "react"
import { formatCurrency, formatDateTime, parseListResponse } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, Loader2 } from "lucide-react"

type PurchaseOrder = {
  id: string
  status: string
  total: unknown
  createdAt: string
  supplier: { name: string }
  items: { quantity: number; product: { name: string } }[]
}

export default function ComprasPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/compras")
    const data = await res.json()
    setOrders(parseListResponse<PurchaseOrder>(data))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" /> Compras
        </h1>
        <p className="text-gray-500 text-sm">Entrada de mercadorias e notas de compra</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos de compra</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Nenhuma compra registrada.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{o.supplier.name}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(o.createdAt)} · {o.items.length} itens</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={o.status === "CONFIRMADA" ? "default" : "secondary"}>{o.status}</Badge>
                    <p className="font-bold text-green-700 mt-1">{formatCurrency(Number(o.total))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
