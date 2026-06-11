"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { clienteSchema, type ClienteInput } from "@/schemas/cliente"
import { formatPhone, formatDate, formatCurrency, parseListResponse } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Search, Pencil, Users, Loader2, Eye } from "lucide-react"
import type { Customer } from "@/types"

export default function ClientesPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
  })

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    const res = await fetch(`/api/clientes?${params}`)
    const data = await res.json()
    setCustomers(parseListResponse<Customer>(data))
    setLoading(false)
  }, [search])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  const openCreate = () => { setEditing(null); reset({}); setOpen(true) }
  const openEdit = (c: Customer) => { setEditing(c); reset({ name: c.name, phone: c.phone ?? "", cpf: c.cpf ?? "", address: c.address ?? "", neighborhood: c.neighborhood ?? "", city: c.city ?? "", notes: c.notes ?? "" }); setOpen(true) }

  const onSubmit = async (data: ClienteInput) => {
    const url = editing ? `/api/clientes/${editing.id}` : "/api/clientes"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (res.ok) {
      toast({ title: editing ? "Cliente atualizado!" : "Cliente cadastrado!" })
      setOpen(false)
      loadCustomers()
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm">{customers.length} clientes cadastrados</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Novo Cliente</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por nome, telefone ou CPF..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Users className="w-10 h-10" />
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cidade</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone ? formatPhone(c.phone) : "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.city ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={c.isActive ? "success" : "secondary"}>{c.isActive ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
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
          <DialogHeader><DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input {...register("name")} placeholder="Nome completo" />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Telefone / WhatsApp</Label>
                <Input {...register("phone")} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1">
                <Label>CPF</Label>
                <Input {...register("cpf")} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Endereço</Label>
              <Input {...register("address")} placeholder="Rua, número" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input {...register("neighborhood")} placeholder="Bairro" />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input {...register("city")} placeholder="Cidade" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea {...register("notes")} rows={2} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" placeholder="Observações..." />
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
