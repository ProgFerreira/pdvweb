"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import {
  DollarSign, ShoppingBag, TrendingUp, Clock, ChefHat, CheckCircle, XCircle, Package,
} from "lucide-react"
import type { DashboardStats } from "@/types"

const PAYMENT_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro", PIX: "Pix", DEBITO: "Débito", CREDITO: "Crédito", VALE: "Vale",
}
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

function StatCard({
  title, value, icon: Icon, color, subtitle,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok || data.error || data.success === false) return null
        const payload = (data.data ?? data) as DashboardStats
        return {
          ...payload,
          salesByPaymentMethod: payload.salesByPaymentMethod ?? [],
          topProducts: payload.topProducts ?? [],
          salesLast7Days: payload.salesLast7Days ?? [],
          lowStockProducts: payload.lowStockProducts ?? [],
        }
      })
      .then((data) => { if (data) setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!stats) return null

  const paymentData = (stats.salesByPaymentMethod ?? []).map((p) => ({
    name: PAYMENT_LABELS[p.method] ?? p.method,
    value: p.total,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Resumo do dia de hoje</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Vendido Hoje"
          value={formatCurrency(stats.totalSoldToday)}
          icon={DollarSign}
          color="bg-blue-600"
          subtitle={`${stats.totalOrdersToday} pedidos`}
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(stats.averageTicket)}
          icon={TrendingUp}
          color="bg-green-600"
          subtitle={stats.salesGrowthPercent != null ? `${stats.salesGrowthPercent >= 0 ? "+" : ""}${stats.salesGrowthPercent.toFixed(1)}% vs ontem` : undefined}
        />
        <StatCard
          title="Aguardando Preparo"
          value={stats.openOrders}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Em Preparo"
          value={stats.preparingOrders}
          icon={ChefHat}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Prontos p/ Retirada"
          value={stats.readyOrders}
          icon={CheckCircle}
          color="bg-teal-600"
        />
        <StatCard
          title="Total de Pedidos"
          value={stats.totalOrdersToday}
          icon={ShoppingBag}
          color="bg-indigo-600"
        />
        <StatCard
          title="Cancelados"
          value={stats.cancelledOrders}
          icon={XCircle}
          color="bg-red-600"
          subtitle={stats.cancellationRate != null ? `${stats.cancellationRate.toFixed(1)}% do total` : undefined}
        />
      </div>

      {stats.operatorRanking && stats.operatorRanking.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por operador (hoje)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 mb-1 px-1">
                <span>Operador</span>
                <span className="text-right">Pedidos</span>
                <span className="text-right">Ticket Médio</span>
                <span className="text-right">Total</span>
              </div>
              {stats.operatorRanking.map((op, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 text-sm border-b pb-2 px-1 items-center">
                  <span className="font-medium truncate">{op.name}</span>
                  <span className="text-right text-gray-600">{op.orders}</span>
                  <span className="text-right text-gray-600">{formatCurrency(op.averageTicket)}</span>
                  <span className="text-right font-semibold">{formatCurrency(op.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vendas dos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.salesLast7Days ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Vendas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paymentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
                Nenhuma venda hoje
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Package className="w-4 h-4" /> Estoque baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.lowStockProducts.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.name} ({p.code})</span>
                  <span className="font-semibold text-amber-700">
                    {p.stock} / mín. {p.minStock}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> Produtos Mais Vendidos Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(stats.topProducts ?? []).length > 0 ? (
            <div className="space-y-3">
              {(stats.topProducts ?? []).map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(p.total)}</p>
                    <p className="text-xs text-gray-500">{p.quantity} un.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum produto vendido hoje</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
