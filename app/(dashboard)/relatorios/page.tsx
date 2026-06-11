"use client"

import { useState } from "react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Search, Loader2, Download } from "lucide-react"
import type { SaleWithRelations } from "@/types"

type ReportType = "vendas" | "produtos" | "cmv"

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO: "Aguardando", EM_PREPARO: "Em Preparo", PRONTO: "Pronto",
  ENTREGUE: "Entregue", CANCELADO: "Cancelado",
}

const STATUS_BADGE: Record<string, string> = {
  AGUARDANDO: "warning", EM_PREPARO: "info", PRONTO: "success",
  ENTREGUE: "secondary", CANCELADO: "destructive",
}

const PAYMENT_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro", PIX: "Pix", DEBITO: "Débito", CREDITO: "Crédito", VALE: "Vale",
}

export default function RelatoriosPage() {
  const [reportType, setReportType] = useState<ReportType>("vendas")
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0])
  const [to, setTo] = useState(new Date().toISOString().split("T")[0])
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [salesData, setSalesData] = useState<SaleWithRelations[]>([])
  const [productsData, setProductsData] = useState<{
    name: string; code: string; quantity: number; revenue: number; costEstimate: number | null; profitEstimate: number | null
  }[]>([])
  const [cmvData, setCmvData] = useState<{
    revenue: number; cmv: number; grossProfit: number; marginPercent: number; products: { name: string; revenue: number; margin: number }[]
  } | null>(null)

  const search = async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (statusFilter !== "all") params.set("status", statusFilter)

    const url = reportType === "cmv"
      ? `/api/relatorios/cmv?dateFrom=${from}&dateTo=${to}`
      : `/api/relatorios/${reportType}?${params}`
    const res = await fetch(url)
    const data = await res.json()

    if (reportType === "cmv") {
      setCmvData(data?.data ?? data)
    } else if (reportType === "vendas") {
      setSalesData(Array.isArray(data) ? data : [])
    } else {
      setProductsData(
        Array.isArray(data)
          ? data.map((p: { name: string; code: string; quantity: number; revenue: number; cost: number; profit: number }) => ({
              name: p.name,
              code: p.code,
              quantity: p.quantity,
              revenue: p.revenue,
              costEstimate: p.cost,
              profitEstimate: p.profit,
            }))
          : []
      )
    }
    setLoading(false)
  }

  const exportCsv = () => {
    let csv = ""
    let filename = "relatorio.csv"

    if (reportType === "vendas" && salesData.length > 0) {
      filename = `vendas-${from}-${to}.csv`
      csv = "Pedido;Data;Cliente;Total;Status;Usuario\n"
      salesData.forEach((s) => {
        const row = [
          s.orderNumber,
          formatDateTime(s.createdAt),
          (s as SaleWithRelations).customer?.name ?? "",
          Number(s.total).toFixed(2),
          STATUS_LABELS[s.status] ?? s.status,
          (s as SaleWithRelations).user?.name ?? "",
        ]
        csv += row.join(";") + "\n"
      })
    } else if (reportType === "produtos" && productsData.length > 0) {
      filename = `produtos-${from}-${to}.csv`
      csv = "Codigo;Produto;Qtd;Faturamento;Custo Est.;Lucro Est.\n"
      productsData.forEach((p) => {
        csv += [p.code, p.name, p.quantity, p.revenue.toFixed(2), p.costEstimate?.toFixed(2) ?? "", p.profitEstimate?.toFixed(2) ?? ""].join(";") + "\n"
      })
    } else if (reportType === "cmv" && cmvData) {
      filename = `cmv-${from}-${to}.csv`
      csv = "Receita;CMV;Lucro Bruto;Margem %\n"
      csv += [cmvData.revenue.toFixed(2), cmvData.cmv.toFixed(2), cmvData.grossProfit.toFixed(2), cmvData.marginPercent.toFixed(1)].join(";") + "\n"
      if (cmvData.products?.length) {
        csv += "\nProduto;Faturamento;Margem %\n"
        cmvData.products.forEach((p) => {
          csv += [p.name, p.revenue.toFixed(2), p.margin.toFixed(1)].join(";") + "\n"
        })
      }
    } else {
      return
    }

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasData = salesData.length > 0 || productsData.length > 0 || cmvData !== null
  const totalVendas = salesData.filter((s) => s.status !== "CANCELADO").reduce((acc, s) => acc + Number(s.total), 0)
  const cancelledCount = salesData.filter((s) => s.status === "CANCELADO").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm">Análise de dados e exportação</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="produtos">Produtos Vendidos</SelectItem>
                  <SelectItem value="cmv">CMV / Margem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            {reportType === "vendas" && (
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={search} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
              Gerar Relatório
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={!hasData}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportType === "cmv" && cmvData && (
        <Card>
          <CardHeader><CardTitle>CMV e Margem — {from} a {to}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><p className="text-xs text-gray-500">Receita</p><p className="font-bold">{formatCurrency(cmvData.revenue)}</p></div>
              <div><p className="text-xs text-gray-500">CMV</p><p className="font-bold text-red-600">{formatCurrency(cmvData.cmv)}</p></div>
              <div><p className="text-xs text-gray-500">Lucro bruto</p><p className="font-bold text-green-700">{formatCurrency(cmvData.grossProfit)}</p></div>
              <div><p className="text-xs text-gray-500">Margem</p><p className="font-bold">{cmvData.marginPercent.toFixed(1)}%</p></div>
            </div>
            {cmvData.products?.length > 0 && (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Faturamento</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Margem %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmvData.products.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(p.revenue)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${p.margin >= 0 ? "text-green-700" : "text-red-600"}`}>{p.margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportType === "vendas" && salesData.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Total de Vendas</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalVendas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Pedidos</p>
                <p className="text-2xl font-bold">{salesData.length - cancelledCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  {(salesData.length - cancelledCount) > 0
                    ? formatCurrency(totalVendas / (salesData.length - cancelledCount))
                    : "R$ 0,00"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Cancelados</p>
                <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Pedido</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Pagamento</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold">#{s.orderNumber}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{formatDateTime(s.createdAt)}</td>
                        <td className="px-4 py-3">{(s as SaleWithRelations).customer?.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          {s.payments.map((p) => PAYMENT_LABELS[p.method] ?? p.method).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(Number(s.total))}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STATUS_BADGE[s.status] as never}>{STATUS_LABELS[s.status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{(s as SaleWithRelations).user?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {reportType === "produtos" && productsData.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Qtd</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Faturamento</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Custo Est.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Lucro Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-right">{p.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(p.revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.costEstimate !== null ? formatCurrency(p.costEstimate) : "-"}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${(p.profitEstimate ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {p.profitEstimate !== null ? formatCurrency(p.profitEstimate) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !hasData && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <BarChart3 className="w-10 h-10" />
          <p className="text-sm">Configure os filtros e clique em &quot;Gerar Relatório&quot;</p>
        </div>
      )}
    </div>
  )
}
