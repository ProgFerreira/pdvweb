"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  contaPagarSchema,
  pagarContaSchema,
  PAYABLE_CATEGORIES,
  PAYMENT_METHODS,
  type ContaPagarInput,
  type PagarContaInput,
} from "@/schemas/conta-pagar"
import {
  PAYABLE_CATEGORY_LABELS,
  PAYABLE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  resolvePayableDisplayStatus,
} from "@/lib/conta-pagar"
import { formatCurrency, formatDate, parseListResponse } from "@/lib/utils"
import { confirmDialog, useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { canDo } from "@/lib/client-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Pencil,
  Loader2,
  Wallet,
  Banknote,
  Trash2,
  CheckCircle2,
} from "lucide-react"
import type { Supplier } from "@/types"

type AccountPayableRow = {
  id: string
  description: string
  category: string
  amount: unknown
  paidAmount: unknown
  dueDate: string
  status: string
  paymentMethod: string | null
  supplier: { id: string; name: string } | null
  notes: string | null
}

type Summary = { openCount: number; openAmount: number }

function statusBadgeVariant(
  status: string
): "success" | "warning" | "destructive" | "secondary" | "info" {
  switch (status) {
    case "PAGO":
      return "success"
    case "VENCIDO":
      return "destructive"
    case "PARCIAL":
      return "warning"
    case "CANCELADO":
      return "secondary"
    default:
      return "info"
  }
}

export default function ContasPagarPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const canPay = canDo(session?.user?.role, "contas_pagar.pagar")
  const canCrud = canDo(session?.user?.role, "contas_pagar.crud")

  const [items, setItems] = useState<AccountPayableRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [summary, setSummary] = useState<Summary>({ openCount: 0, openAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [openForm, setOpenForm] = useState(false)
  const [openPay, setOpenPay] = useState(false)
  const [editing, setEditing] = useState<AccountPayableRow | null>(null)
  const [paying, setPaying] = useState<AccountPayableRow | null>(null)

  const form = useForm<ContaPagarInput>({
    resolver: zodResolver(contaPagarSchema),
    defaultValues: { category: "OUTROS" },
  })

  const payForm = useForm<PagarContaInput>({
    resolver: zodResolver(pagarContaSchema),
    defaultValues: { paymentMethod: "PIX" },
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    if (categoryFilter) params.set("category", categoryFilter)
    const res = await fetch(`/api/contas-pagar?${params}`)
    const data = await res.json()
    setItems(parseListResponse<AccountPayableRow>(data))
    if (data?.summary) setSummary(data.summary)
    setLoading(false)
  }, [search, statusFilter, categoryFilter])

  const loadSuppliers = useCallback(async () => {
    const res = await fetch("/api/fornecedores?pageSize=200")
    const data = await res.json()
    setSuppliers(parseListResponse<Supplier>(data))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const openCreate = () => {
    setEditing(null)
    form.reset({
      description: "",
      category: "OUTROS",
      amount: 0,
      dueDate: new Date().toISOString().slice(0, 10),
      supplierId: "",
      notes: "",
    })
    setOpenForm(true)
  }

  const openEdit = (row: AccountPayableRow) => {
    setEditing(row)
    form.reset({
      description: row.description,
      category: row.category as ContaPagarInput["category"],
      amount: Number(row.amount),
      dueDate: row.dueDate.slice(0, 10),
      supplierId: row.supplier?.id ?? "",
      notes: row.notes ?? "",
    })
    setOpenForm(true)
  }

  const openPayment = (row: AccountPayableRow) => {
    const remaining = Number(row.amount) - Number(row.paidAmount)
    setPaying(row)
    payForm.reset({
      amount: remaining,
      paymentMethod: "PIX",
      paidAt: new Date().toISOString().slice(0, 10),
    })
    setOpenPay(true)
  }

  const onSubmit = async (data: ContaPagarInput) => {
    const url = editing ? `/api/contas-pagar/${editing.id}` : "/api/contas-pagar"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast({ title: editing ? "Conta atualizada!" : "Conta cadastrada!" })
      setOpenForm(false)
      load()
    } else {
      const err = await res.json()
      toast({
        title: "Erro ao salvar",
        description: err.error ?? "Verifique os dados",
        variant: "destructive",
      })
    }
  }

  const onPay = async (data: PagarContaInput) => {
    if (!paying) return
    const res = await fetch(`/api/contas-pagar/${paying.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast({ title: "Pagamento registrado!" })
      setOpenPay(false)
      load()
    } else {
      const err = await res.json()
      toast({
        title: "Erro ao registrar pagamento",
        description: err.error ?? "Verifique o valor",
        variant: "destructive",
      })
    }
  }

  const onDelete = async (row: AccountPayableRow) => {
    const ok = await confirmDialog({
      title: "Cancelar conta?",
      text: `A conta "${row.description}" será cancelada.`,
      confirmText: "Cancelar conta",
      danger: true,
      icon: "warning",
    })
    if (!ok) return
    const res = await fetch(`/api/contas-pagar/${row.id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Conta cancelada" })
      load()
    } else {
      toast({ title: "Erro ao cancelar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6" /> Contas a Pagar
          </h1>
          <p className="text-gray-500 text-sm">
            Gestão de despesas e pagamentos a fornecedores
          </p>
        </div>
        {canCrud && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nova Conta
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Em aberto</p>
            <p className="text-2xl font-bold text-amber-700">
              {formatCurrency(summary.openAmount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {summary.openCount} conta(s) pendente(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Listadas</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            <p className="text-xs text-gray-400 mt-1">com filtros aplicados</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar descrição ou fornecedor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="VENCIDO">Vencido</SelectItem>
            <SelectItem value="PARCIAL">Parcial</SelectItem>
            <SelectItem value="PAGO">Pago</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter || "all"}
          onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {PAYABLE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {PAYABLE_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Banknote className="w-10 h-10" />
              <p className="text-sm">Nenhuma conta encontrada</p>
            </div>
          ) : (
            <div className="table-wrapper border-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Descrição
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                      Fornecedor
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                      Categoria
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Vencimento
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Valor
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const amount = Number(row.amount)
                    const paid = Number(row.paidAmount)
                    const displayStatus = resolvePayableDisplayStatus(
                      row.status as never,
                      new Date(row.dueDate),
                      paid,
                      amount
                    )
                    const remaining = amount - paid
                    const canEditRow =
                      canCrud &&
                      row.status !== "PAGO" &&
                      row.status !== "CANCELADO"
                    const canPayRow =
                      canPay &&
                      row.status !== "PAGO" &&
                      row.status !== "CANCELADO"

                    return (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.description}</p>
                          {paid > 0 && paid < amount && (
                            <p className="text-xs text-gray-500">
                              Pago: {formatCurrency(paid)} · Saldo:{" "}
                              {formatCurrency(remaining)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                          {row.supplier?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                          {PAYABLE_CATEGORY_LABELS[row.category] ?? row.category}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(row.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={statusBadgeVariant(displayStatus)}>
                            {PAYABLE_STATUS_LABELS[displayStatus]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {canPayRow && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Registrar pagamento"
                                onClick={() => openPayment(row)}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {canEditRow && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {canCrud && row.status !== "CANCELADO" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancelar"
                                onClick={() => onDelete(row)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Conta" : "Nova Conta a Pagar"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input
                {...form.register("description")}
                placeholder="Ex: Nota fornecedor aves"
              />
              {form.formState.errors.description && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <select
                  {...form.register("category")}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {PAYABLE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {PAYABLE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Vencimento *</Label>
                <Input type="date" {...form.register("dueDate")} />
                {form.formState.errors.dueDate && (
                  <p className="text-red-500 text-xs">
                    {form.formState.errors.dueDate.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("amount")}
                />
                {form.formState.errors.amount && (
                  <p className="text-red-500 text-xs">
                    {form.formState.errors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <select
                  {...form.register("supplierId")}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">— Nenhum —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea
                {...form.register("notes")}
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Observações..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {paying && (
            <p className="text-sm text-gray-600 -mt-2">
              {paying.description} · Saldo:{" "}
              {formatCurrency(
                Number(paying.amount) - Number(paying.paidAmount)
              )}
            </p>
          )}
          <form
            onSubmit={payForm.handleSubmit(onPay)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>Valor pago *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...payForm.register("amount")}
              />
              {payForm.formState.errors.amount && (
                <p className="text-red-500 text-xs">
                  {payForm.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Forma de pagamento *</Label>
                <select
                  {...payForm.register("paymentMethod")}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Data do pagamento</Label>
                <Input type="date" {...payForm.register("paidAt")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input
                {...payForm.register("notes")}
                placeholder="Opcional"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenPay(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={payForm.formState.isSubmitting}>
                {payForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  "Confirmar pagamento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
