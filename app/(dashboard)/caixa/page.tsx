"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { hasPermission } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FolderOpen,
  CheckCircle2,
  CreditCard,
  Unlock,
  Lock,
  ShoppingCart,
  Wallet,
  Filter,
  Search,
  List,
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  X,
  Calendar,
} from "lucide-react"
import type { CashRegister, CashMovement } from "@/types"

type CashRow = CashRegister & {
  user: { id: string; name: string }
  movements: CashMovement[]
  _count: { sales: number }
}

type CaixaStats = {
  totalCaixas: number
  abertos: number
  fechados: number
  totalVendas: number
  saldoTotal: number
}

type Operator = { id: string; name: string }

function finalBalance(row: CashRow): number | null {
  if (row.status !== "FECHADO") return null
  if (row.countedCash != null) return Number(row.countedCash)
  return Number(row.initialAmount) + Number(row.totalCash)
}

function KpiCard({
  title,
  value,
  icon: Icon,
  borderClass,
  iconClass,
}: {
  title: string
  value: string
  icon: React.ElementType
  borderClass: string
  iconClass: string
}) {
  return (
    <div className={`kpi-card ${borderClass}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}

export default function CaixaHistoricoPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ""

  const [registers, setRegisters] = useState<CashRow[]>([])
  const [stats, setStats] = useState<CaixaStats | null>(null)
  const [operators, setOperators] = useState<Operator[]>([])
  const [hasOpenCash, setHasOpenCash] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [operatorId, setOperatorId] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [viewRow, setViewRow] = useState<CashRow | null>(null)
  const [editRow, setEditRow] = useState<CashRow | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [closeRow, setCloseRow] = useState<CashRow | null>(null)
  const [countedCash, setCountedCash] = useState("")
  const [closeNotes, setCloseNotes] = useState("")

  const canCloseAny =
    hasPermission(role, "configuracoes.editar") || hasPermission(role, "usuarios.crud")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: "100" })
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (operatorId !== "all") params.set("userId", operatorId)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const [listRes, atualRes] = await Promise.all([
        fetch(`/api/caixa?${params}`),
        fetch("/api/caixa/atual"),
      ])

      const listData = await listRes.json()
      if (!listRes.ok) throw new Error(listData?.error ?? "Erro ao listar caixas")
      setRegisters(listData.data ?? [])
      setStats(listData.stats ?? null)
      setOperators(listData.operators ?? [])

      const atualData = await atualRes.json()
      const atual = atualData?.data ?? atualData
      setHasOpenCash(Boolean(atual?.id && !atualData?.error))
    } catch {
      toast({ title: "Erro ao carregar histórico", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, operatorId, statusFilter, toast])

  useEffect(() => {
    load()
  }, [load])

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setOperatorId("all")
    setStatusFilter("all")
  }

  const handleEditSave = async () => {
    if (!editRow) return
    const res = await fetch(`/api/caixa/${editRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes }),
    })
    if (res.ok) {
      toast({ title: "Observações atualizadas" })
      setEditRow(null)
      load()
    } else {
      const err = await res.json()
      toast({ title: "Erro", description: err.error, variant: "destructive" })
    }
  }

  const handleClose = async () => {
    if (!closeRow) return
    const counted = parseFloat(countedCash)
    if (isNaN(counted) || counted < 0) {
      toast({ title: "Informe o dinheiro contado", variant: "destructive" })
      return
    }
    const res = await fetch("/api/caixa/fechar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cashRegisterId: closeRow.id,
        countedCash: counted,
        closeNotes: closeNotes || undefined,
      }),
    })
    if (res.ok) {
      toast({ title: "Caixa fechado!" })
      setCloseRow(null)
      setCountedCash("")
      setCloseNotes("")
      load()
    } else {
      const err = await res.json()
      toast({ title: "Erro", description: err.error, variant: "destructive" })
    }
  }

  const canCloseRow = (row: CashRow) => {
    if (row.status !== "ABERTO") return false
    if (!session?.user?.id) return false
    return row.userId === session.user.id || canCloseAny
  }

  const expectedCash = closeRow
    ? Number(closeRow.initialAmount) + Number(closeRow.totalCash)
    : 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
            <FolderOpen className="w-7 h-7 text-gray-700" />
            Fluxo de Caixa (Histórico)
          </h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            {hasOpenCash
              ? "Você já tem um caixa aberto. Use o PDV para vender e feche o caixa ao final."
              : "Consulte o histórico de aberturas e fechamentos de caixa."}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {hasOpenCash && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <CheckCircle2 className="w-4 h-4" />
              Caixa aberto
            </span>
          )}
          <Link href="/caixa/operacao">
            <Button variant="outline" size="sm">
              <CreditCard className="w-4 h-4" /> Operar caixa
            </Button>
          </Link>
          <Link href="/pdv">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
              <ShoppingCart className="w-4 h-4" /> Ir ao PDV
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Total de Caixas"
          value={String(stats?.totalCaixas ?? 0)}
          icon={CreditCard}
          borderClass="kpi-card-blue"
          iconClass="bg-blue-100 text-blue-600"
        />
        <KpiCard
          title="Caixas Abertos"
          value={String(stats?.abertos ?? 0)}
          icon={Unlock}
          borderClass="kpi-card-green"
          iconClass="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          title="Caixas Fechados"
          value={String(stats?.fechados ?? 0)}
          icon={Lock}
          borderClass="kpi-card-teal"
          iconClass="bg-teal-100 text-teal-600"
        />
        <KpiCard
          title="Total de Vendas"
          value={formatCurrency(stats?.totalVendas ?? 0)}
          icon={ShoppingCart}
          borderClass="kpi-card-purple"
          iconClass="bg-purple-100 text-purple-600"
        />
        <KpiCard
          title="Saldo Total"
          value={formatCurrency(stats?.saldoTotal ?? 0)}
          icon={Wallet}
          borderClass="kpi-card-amber"
          iconClass="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Filtros */}
      <div className="filter-card">
        <div className="flex items-center gap-2 mb-4 font-semibold text-foreground">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="filter-label">Data inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="filter-label">Data final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="filter-label">Operador</label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="filter-label">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ABERTO">Aberto</SelectItem>
                <SelectItem value="FECHADO">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            onClick={load}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Search className="w-4 h-4" />
            Filtrar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={clearFilters}
            title="Limpar filtros"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="section-card">
        <div className="section-card-header">
          <List className="w-5 h-5" />
          Histórico de Caixas
        </div>
        <div className="table-wrapper border-0 rounded-none">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : registers.length === 0 ? (
            <p className="text-center text-muted-foreground py-16 text-sm">
              Nenhum caixa encontrado para os filtros selecionados.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="text-left p-3 w-10" />
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Operador</th>
                  <th className="text-left p-3">Abertura</th>
                  <th className="text-left p-3">Fechamento</th>
                  <th className="text-right p-3">Saldo Inicial</th>
                  <th className="text-right p-3">Saldo Final</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registers.map((row, index) => {
                  const displayNum = registers.length - index
                  const expanded = expandedId === row.id
                  const saldoFinal = finalBalance(row)
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={`border-b hover:bg-gray-50 ${index % 2 === 1 ? "bg-gray-50/50" : ""}`}
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500"
                            aria-label={expanded ? "Recolher" : "Expandir"}
                          >
                            {expanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-semibold text-violet-700">#{displayNum}</td>
                        <td className="p-3">{row.user?.name ?? "—"}</td>
                        <td className="p-3 text-gray-600">{formatDateTime(row.openedAt)}</td>
                        <td className="p-3 text-gray-600">
                          {row.closedAt ? formatDateTime(row.closedAt) : (
                            <span className="text-amber-600 font-medium">Em aberto</span>
                          )}
                        </td>
                        <td className="p-3 text-right">{formatCurrency(Number(row.initialAmount))}</td>
                        <td className="p-3 text-right font-medium">
                          {saldoFinal != null ? formatCurrency(saldoFinal) : "—"}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={row.status === "ABERTO" ? "success" : "secondary"}
                            className="uppercase text-[10px] tracking-wide"
                          >
                            {row.status === "ABERTO" ? "Aberto" : "Fechado"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600"
                              title="Visualizar"
                              onClick={() => setViewRow(row)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600"
                              title="Editar observações"
                              onClick={() => {
                                setEditRow(row)
                                setEditNotes(row.notes ?? "")
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              title="Exclusão não disponível"
                              onClick={() =>
                                toast({
                                  title: "Ação indisponível",
                                  description: "Caixas com vendas não podem ser excluídos.",
                                  variant: "destructive",
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Link href={`/caixa/operacao`} title="Operar caixa">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-600">
                                <Lock className="w-4 h-4" />
                              </Button>
                            </Link>
                            {canCloseRow(row) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs gap-1"
                                onClick={() => {
                                  setCloseRow(row)
                                  setCountedCash("")
                                  setCloseNotes("")
                                }}
                              >
                                <Lock className="w-3 h-3" />
                                Fechar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${row.id}-detail`} className="bg-gray-50 border-b">
                          <td colSpan={9} className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-muted-foreground">Vendas:</span>{" "}
                                <strong>{row._count?.sales ?? 0}</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total vendas:</span>{" "}
                                <strong>{formatCurrency(Number(row.totalSales))}</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Pix:</span>{" "}
                                <strong>{formatCurrency(Number(row.totalPix))}</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Dinheiro:</span>{" "}
                                <strong>{formatCurrency(Number(row.totalCash))}</strong>
                              </div>
                            </div>
                            {(row.movements ?? []).length > 0 ? (
                              <table className="w-full text-xs border rounded-md overflow-hidden bg-white">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="text-left p-2">Tipo</th>
                                    <th className="text-left p-2">Descrição</th>
                                    <th className="text-right p-2">Valor</th>
                                    <th className="text-right p-2">Data</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.movements.map((m) => (
                                    <tr key={m.id} className="border-t">
                                      <td className="p-2">{m.type}</td>
                                      <td className="p-2">{m.description ?? "—"}</td>
                                      <td className="p-2 text-right">{formatCurrency(Number(m.amount))}</td>
                                      <td className="p-2 text-right text-muted-foreground">
                                        {formatDateTime(m.createdAt)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-muted-foreground">Sem movimentos registrados.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dialog — Visualizar */}
      <Dialog open={!!viewRow} onOpenChange={() => setViewRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Caixa</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Operador</span>
                  <p className="font-medium">{viewRow.user?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium">{viewRow.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Abertura</span>
                  <p>{formatDateTime(viewRow.openedAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fechamento</span>
                  <p>{viewRow.closedAt ? formatDateTime(viewRow.closedAt) : "Em aberto"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Saldo inicial</span>
                  <p>{formatCurrency(Number(viewRow.initialAmount))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Saldo final</span>
                  <p>
                    {finalBalance(viewRow) != null
                      ? formatCurrency(finalBalance(viewRow)!)
                      : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Total de vendas</span>
                  <p className="font-semibold text-green-700">
                    {formatCurrency(Number(viewRow.totalSales))} ({viewRow._count?.sales ?? 0} vendas)
                  </p>
                </div>
                {viewRow.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Observações</span>
                    <p>{viewRow.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Observações</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Observações</Label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Fechar */}
      <Dialog open={!!closeRow} onOpenChange={() => setCloseRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>
          {closeRow && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Operador: <strong>{closeRow.user?.name}</strong>
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dinheiro esperado:</span>
                  <span className="font-semibold">{formatCurrency(expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de vendas:</span>
                  <span className="font-semibold">{formatCurrency(Number(closeRow.totalSales))}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Dinheiro contado (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                />
              </div>
              {countedCash && (
                <p className="text-sm font-medium text-amber-600">
                  Diferença: {formatCurrency(parseFloat(countedCash) - expectedCash)}
                </p>
              )}
              <div className="space-y-1">
                <Label>Observações de fechamento</Label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseRow(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClose}>
              <Lock className="w-4 h-4" /> Fechar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
