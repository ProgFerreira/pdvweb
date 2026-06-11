"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { fornecedorSchema, type FornecedorInput } from "@/schemas/fornecedor"
import { parseListResponse } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Search, Pencil, Truck, Loader2 } from "lucide-react"
import type { Supplier } from "@/types"

export default function FornecedoresPage() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FornecedorInput>({
    resolver: zodResolver(fornecedorSchema),
  })

  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    const res = await fetch(`/api/fornecedores?${params}`)
    const data = await res.json()
    setSuppliers(parseListResponse<Supplier>(data))
    setLoading(false)
  }, [search])

  useEffect(() => { loadSuppliers() }, [loadSuppliers])

  const openCreate = () => { setEditing(null); reset({}); setOpen(true) }
  const openEdit = (s: Supplier) => {
    setEditing(s)
    reset({ name: s.name, document: s.document ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", supplyType: s.supplyType ?? "", notes: s.notes ?? "" })
    setOpen(true)
  }

  const onSubmit = async (data: FornecedorInput) => {
    const url = editing ? `/api/fornecedores/${editing.id}` : "/api/fornecedores"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (res.ok) {
      toast({ title: editing ? "Fornecedor atualizado!" : "Fornecedor cadastrado!" })
      setOpen(false)
      loadSuppliers()
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-500 text-sm">{suppliers.length} fornecedores cadastrados</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Novo Fornecedor</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por nome ou CNPJ/CPF..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Truck className="w-10 h-10" />
              <p className="text-sm">Nenhum fornecedor encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">CNPJ/CPF</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.document ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{s.phone ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{s.supplyType ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={s.isActive ? "success" : "secondary"}>{s.isActive ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome / Razão Social *</Label>
              <Input {...register("name")} placeholder="Nome do fornecedor" />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>CNPJ / CPF</Label>
                <Input {...register("document")} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input {...register("phone")} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input {...register("email")} type="email" placeholder="email@empresa.com" />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Tipo de Fornecimento</Label>
                <Input {...register("supplyType")} placeholder="Ex: Aves, Bebidas" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Endereço</Label>
              <Input {...register("address")} placeholder="Endereço completo" />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea {...register("notes")} rows={2} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" placeholder="Observações..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} defaultChecked className="rounded" />
              <Label htmlFor="isActive">Fornecedor ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
