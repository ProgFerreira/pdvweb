"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import {
  notaFiscalCompraSchema,
  type NotaFiscalCompraInput,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
} from "@/schemas/nota-fiscal-compra"
import { formatCurrency, formatDate, formatPhone, parseListResponse } from "@/lib/utils"
import { canDo } from "@/lib/client-permissions"
import { confirmDialog, useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  Filter,
  FileText,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  FileUp,
} from "lucide-react"
import type { Supplier } from "@/types"

type PurchaseInvoiceRow = {
  id: string
  number: string | null
  issueDate: string
  amount: unknown
  status: "PENDENTE" | "PAGO" | "CANCELADO"
  paymentMethod: keyof typeof PAYMENT_METHOD_LABELS | null
  fileUrl: string | null
  notes: string | null
  supplier: { id: string; name: string; phone: string | null }
}

const STATUS_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "PAGO", label: "Pago" },
  { value: "CANCELADO", label: "Cancelado" },
]

export default function NotasFiscaisCompraPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const canEdit = canDo(session?.user?.role, "notas_fiscais.crud")

  const [invoices, setInvoices] = useState<PurchaseInvoiceRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editing, setEditing] = useState<PurchaseInvoiceRow | null>(null)
  const [viewing, setViewing] = useState<PurchaseInvoiceRow | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileMime, setFileMime] = useState<string | null>(null)

  const [filterStatus, setFilterStatus] = useState("TODOS")
  const [filterSupplier, setFilterSupplier] = useState("TODOS")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NotaFiscalCompraInput>({
    resolver: zodResolver(notaFiscalCompraSchema),
    defaultValues: { status: "PENDENTE" },
  })

  const statusValue = watch("status")

  const loadSuppliers = useCallback(async () => {
    const res = await fetch("/api/fornecedores?pageSize=200")
    const data = await res.json()
    setSuppliers(parseListResponse<Supplier>(data))
  }, [])

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== "TODOS") params.set("status", filterStatus)
    if (filterSupplier !== "TODOS") params.set("supplierId", filterSupplier)
    if (filterDateFrom) params.set("dateFrom", filterDateFrom)
    if (filterDateTo) params.set("dateTo", filterDateTo)
    const res = await fetch(`/api/notas-fiscais-compra?${params}`)
    const data = await res.json()
    setInvoices(parseListResponse<PurchaseInvoiceRow>(data))
    setLoading(false)
  }, [filterStatus, filterSupplier, filterDateFrom, filterDateTo])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const openCreate = () => {
    setEditing(null)
    setFileUrl(null)
    setFileMime(null)
    reset({
      supplierId: "",
      number: "",
      issueDate: new Date().toISOString().slice(0, 10),
      amount: 0,
      status: "PENDENTE",
      notes: "",
    })
    setOpen(true)
  }

  const openEdit = (row: PurchaseInvoiceRow) => {
    setEditing(row)
    setFileUrl(row.fileUrl)
    setFileMime(null)
    reset({
      supplierId: row.supplier.id,
      number: row.number ?? "",
      issueDate: row.issueDate.slice(0, 10),
      amount: Number(row.amount),
      status: row.status,
      paymentMethod: row.paymentMethod ?? undefined,
      notes: row.notes ?? "",
      fileUrl: row.fileUrl,
    })
    setOpen(true)
  }

  const openView = (row: PurchaseInvoiceRow) => {
    setViewing(row)
    setViewOpen(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/notas-fiscais-compra/upload", { method: "POST", body: formData })
    setUploading(false)
    if (res.ok) {
      const data = await res.json()
      setFileUrl(data.fileUrl)
      setFileMime(data.fileMime)
      setValue("fileUrl", data.fileUrl)
      setValue("fileMime", data.fileMime)
      toast({ title: "Comprovante enviado!" })
    } else {
      const err = await res.json()
      toast({ title: err.error ?? "Erro ao enviar arquivo", variant: "destructive" })
    }
    e.target.value = ""
  }

  const onSubmit = async (data: NotaFiscalCompraInput) => {
    const payload = {
      ...data,
      fileUrl: fileUrl ?? data.fileUrl,
      fileMime: fileMime ?? data.fileMime,
    }
    const url = editing
      ? `/api/notas-fiscais-compra/${editing.id}`
      : "/api/notas-fiscais-compra"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      toast({ title: editing ? "Nota fiscal atualizada!" : "Nota fiscal cadastrada!" })
      setOpen(false)
      loadInvoices()
    } else {
      const err = await res.json()
      toast({ title: err.error ?? "Erro ao salvar", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: "Excluir nota fiscal?",
      text: "Esta ação não pode ser desfeita. O registro será removido da listagem.",
      confirmText: "Excluir",
      danger: true,
      icon: "warning",
    })
    if (!ok) return

    const res = await fetch(`/api/notas-fiscais-compra/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Nota fiscal excluída!" })
      loadInvoices()
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" })
    }
  }

  const paymentLabel = (row: PurchaseInvoiceRow) => {
    if (row.status !== "PAGO" || !row.paymentMethod) return "—"
    return PAYMENT_METHOD_LABELS[row.paymentMethod]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais de Compras</h1>
        <p className="text-gray-500 text-sm mt-1 max-w-2xl">
          Armazene e consulte NFs de compras: fornecedor, data, valor, status e comprovante (imagem/PDF).
        </p>
        {canEdit && (
          <Button className="mt-4 btn-primary gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova Nota Fiscal
          </Button>
        )}
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <Filter className="w-4 h-4 text-muted-foreground" />
          Filtros
        </div>
        <div className="section-card-body p-5 space-y-4">
          <div className="filter-grid">
            <div>
              <Label className="filter-label">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="filter-label">Fornecedor</Label>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="filter-label">Data emissão (início)</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="filter-label">Data emissão (fim)</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-center pt-1">
            <Button variant="ghost" onClick={loadInvoices}>
              Filtrar
            </Button>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-header">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Listagem
        </div>
        <div className="section-card-body">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Nenhuma nota fiscal encontrada.
            </p>
          ) : (
            <div className="table-wrapper border-0 rounded-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head-soft">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Fornecedor / Telefone</th>
                    <th className="text-right px-4 py-3">Valor</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-center px-4 py-3">Pagamento</th>
                    <th className="text-right px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 text-gray-700">{formatDate(row.issueDate)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{row.supplier.name}</p>
                        <p className="text-gray-500 text-xs">
                          {row.supplier.phone ? formatPhone(row.supplier.phone) : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(Number(row.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            row.status === "PAGO"
                              ? "text-green-700 font-medium"
                              : row.status === "CANCELADO"
                                ? "text-red-600 font-medium"
                                : "text-gray-500 font-medium"
                          }
                        >
                          {STATUS_LABELS[row.status].toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{paymentLabel(row)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {row.fileUrl && (
                            <Button variant="ghost" size="icon" asChild title="Comprovante">
                              <a href={row.fileUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="w-4 h-4 text-gray-500" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Visualizar"
                            onClick={() => openView(row)}
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="w-4 h-4 text-gray-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Excluir"
                                onClick={() => handleDelete(row.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Fornecedor *</Label>
              <Select
                value={watch("supplierId") || ""}
                onValueChange={(v) => setValue("supplierId", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplierId && (
                <p className="text-red-500 text-xs">{errors.supplierId.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Número da NF</Label>
                <Input {...register("number")} placeholder="Opcional" />
              </div>
              <div className="space-y-1">
                <Label>Data de emissão *</Label>
                <Input type="date" {...register("issueDate")} />
                {errors.issueDate && (
                  <p className="text-red-500 text-xs">{errors.issueDate.message}</p>
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
                  {...register("amount", { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={statusValue}
                  onValueChange={(v) =>
                    setValue("status", v as NotaFiscalCompraInput["status"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="PAGO">Pago</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {statusValue === "PAGO" && (
              <div className="space-y-1">
                <Label>Forma de pagamento</Label>
                <Select
                  value={watch("paymentMethod") ?? ""}
                  onValueChange={(v) =>
                    setValue("paymentMethod", v as NotaFiscalCompraInput["paymentMethod"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Comprovante (PDF ou imagem)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="text-sm"
                />
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {fileUrl && !uploading && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <FileUp className="w-3 h-3" /> Ver arquivo
                  </a>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea
                {...register("notes")}
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Observações opcionais..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || uploading}>
                {isSubmitting ? (
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

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Nota Fiscal</DialogTitle>
          </DialogHeader>
          {viewing && (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Fornecedor</dt>
                <dd className="font-medium">{viewing.supplier.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Data de emissão</dt>
                <dd>{formatDate(viewing.issueDate)}</dd>
              </div>
              {viewing.number && (
                <div>
                  <dt className="text-muted-foreground">Número</dt>
                  <dd>{viewing.number}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-semibold">{formatCurrency(Number(viewing.amount))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{STATUS_LABELS[viewing.status]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pagamento</dt>
                <dd>{paymentLabel(viewing)}</dd>
              </div>
              {viewing.notes && (
                <div>
                  <dt className="text-muted-foreground">Observações</dt>
                  <dd>{viewing.notes}</dd>
                </div>
              )}
              {viewing.fileUrl && (
                <div>
                  <dt className="text-muted-foreground">Comprovante</dt>
                  <dd>
                    <a
                      href={viewing.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Abrir arquivo
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


