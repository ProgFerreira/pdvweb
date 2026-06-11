"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { promocaoSchema, type PromocaoInput } from "@/schemas/promocao"
import { formatCurrency, formatDate, parseListResponse } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Tag, Loader2, Pencil, Trash2 } from "lucide-react"

type Promotion = {
  id: string
  name: string
  type: string
  value: unknown
  isActive: boolean
  startAt: string | null
  endAt: string | null
  categoryId: string | null
  productId: string | null
}

export default function PromocoesPage() {
  const { toast } = useToast()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting, errors } } = useForm<PromocaoInput>({
    resolver: zodResolver(promocaoSchema),
    defaultValues: { type: "PERCENT", isActive: true },
  })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/promocoes")
    const data = await res.json()
    setPromotions(parseListResponse<Promotion>(data))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    reset({ type: "PERCENT", isActive: true, value: undefined, name: "", startAt: "", endAt: "" })
    setOpen(true)
  }

  const openEdit = (p: Promotion) => {
    setEditing(p)
    reset({
      name: p.name,
      type: p.type as PromocaoInput["type"],
      value: Number(p.value),
      isActive: p.isActive,
      startAt: p.startAt ? p.startAt.slice(0, 10) : "",
      endAt: p.endAt ? p.endAt.slice(0, 10) : "",
      categoryId: p.categoryId ?? "",
      productId: p.productId ?? "",
    })
    setOpen(true)
  }

  const onSubmit = async (data: PromocaoInput) => {
    const url = editing ? `/api/promocoes/${editing.id}` : "/api/promocoes"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast({ title: editing ? "Promoção atualizada" : "Promoção criada" })
      setOpen(false)
      load()
    } else {
      const err = await res.json()
      toast({ title: "Erro", description: err.error ?? "Tente novamente", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/promocoes/${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    setDeleteTarget(null)
    if (res.ok) {
      toast({ title: "Promoção removida" })
      load()
    } else {
      const err = await res.json()
      toast({ title: "Erro", description: err.error ?? "Tente novamente", variant: "destructive" })
    }
  }

  const typeValue = watch("type")
  const isActive = watch("isActive")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6" /> Promoções
          </h1>
          <p className="text-gray-500 text-sm">Descontos por produto ou categoria</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nova promoção</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : promotions.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Nenhuma promoção cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Desconto</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Vigência</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-center font-semibold text-green-700">
                        {p.type === "PERCENT"
                          ? `${Number(p.value).toFixed(0)}%`
                          : formatCurrency(Number(p.value))}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {p.startAt || p.endAt
                          ? `${p.startAt ? formatDate(p.startAt) : "—"} → ${p.endAt ? formatDate(p.endAt) : "sem fim"}`
                          : "Permanente"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={p.isActive ? "success" : "secondary"}>
                          {p.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(p)}
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar promoção" : "Nova promoção"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input {...register("name")} placeholder="Ex: Promoção de Verão" />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={typeValue} onValueChange={(v) => setValue("type", v as PromocaoInput["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percentual (%)</SelectItem>
                    <SelectItem value="FIXED">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={typeValue === "PERCENT" ? "10" : "5.00"}
                  {...register("value")}
                />
                {errors.value && <p className="text-red-500 text-xs">{errors.value.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Início (opcional)</Label>
                <Input type="date" {...register("startAt")} />
              </div>
              <div className="space-y-1">
                <Label>Fim (opcional)</Label>
                <Input type="date" {...register("endAt")} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={!!isActive}
                onClick={() => setValue("isActive", !isActive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <Label className="cursor-pointer" onClick={() => setValue("isActive", !isActive)}>
                Promoção ativa
              </Label>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Não é possível ter duas promoções ativas para o mesmo produto ou categoria no mesmo período.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvando...</> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover promoção</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover a promoção <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
