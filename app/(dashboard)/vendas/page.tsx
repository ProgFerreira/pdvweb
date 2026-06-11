"use client"

import { useEffect, useState, useCallback } from "react"
import { formatCurrency, formatDateTime, parseListResponse } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Printer, Loader2, History } from "lucide-react"
import type { SaleWithRelations } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO: "Aguardando",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
}

export default function VendasPage() {
  const { toast } = useToast()
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ pageSize: "50" })
    if (status !== "all") params.append("status", status)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    const res = await fetch(`/api/vendas?${params}`)
    const data = await res.json()
    let list = parseListResponse<SaleWithRelations>(data)
    if (search) {
      const term = search.toLowerCase()
      list = list.filter(
        (s) =>
          String(s.orderNumber).includes(term) ||
          s.customer?.name?.toLowerCase().includes(term) ||
          s.user?.name?.toLowerCase().includes(term)
      )
    }
    setSales(list)
    setLoading(false)
  }, [status, dateFrom, dateTo, search])

  useEffect(() => { load() }, [load])

  const printOrder = (id: string) => {
    import("@/lib/open-print").then((m) => m.openPrintWindow(id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-6 h-6" /> Histórico de Vendas
        </h1>
        <p className="text-gray-500 text-sm">Consulte, filtre e reimprima pedidos</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Nº pedido, cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        <Button variant="outline" onClick={load}>Atualizar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-40 items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : sales.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Nenhuma venda encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Pedido</th>
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Cliente</th>
                    <th className="text-left p-3 font-medium">Operador</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold">#{sale.orderNumber}</td>
                      <td className="p-3 text-gray-600">{formatDateTime(sale.createdAt)}</td>
                      <td className="p-3">{sale.customer?.name ?? "—"}</td>
                      <td className="p-3">{sale.user?.name}</td>
                      <td className="p-3">
                        <Badge variant={sale.status === "CANCELADO" ? "destructive" : "secondary"}>
                          {STATUS_LABELS[sale.status] ?? sale.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-semibold text-green-700">{formatCurrency(Number(sale.total))}</td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => printOrder(sale.id)}>
                          <Printer className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
