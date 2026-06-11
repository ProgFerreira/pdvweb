"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { produtoSchema, type ProdutoInput } from "@/schemas/produto"
import { formatCurrency, parseListResponse } from "@/lib/utils"
import { confirmDialog, useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Pencil, Trash2, Package, Loader2 } from "lucide-react"
import type { ProductWithCategory, Category } from "@/types"

export default function ProdutosPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductWithCategory | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProdutoInput>({
    resolver: zodResolver(produtoSchema),
    defaultValues: { isActive: true, stock: 0, minStock: 0 },
  })

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (filterCategory && filterCategory !== "all") params.set("categoryId", filterCategory)
    const res = await fetch(`/api/produtos?${params}`)
    const data = await res.json()
    if (!res.ok || data?.error) {
      setProducts([])
      if (data?.error) toast({ title: "Erro ao carregar produtos", description: data.error, variant: "destructive" })
    } else {
      setProducts(parseListResponse<ProductWithCategory>(data))
    }
    setLoading(false)
  }, [search, filterCategory])

  useEffect(() => {
    fetch("/api/categorias").then((r) => r.json()).then((d) => setCategories(parseListResponse<Category>(d)))
    loadProducts()
  }, [loadProducts])

  const openCreate = () => { setEditing(null); reset({ isActive: true, stock: 0, minStock: 0 }); setOpen(true) }
  const openEdit = (p: ProductWithCategory) => {
    setEditing(p)
    reset({
      code: p.code, name: p.name, description: p.description ?? "",
      categoryId: p.categoryId, price: Number(p.price),
      cost: p.cost ? Number(p.cost) : undefined, stock: p.stock,
      minStock: p.minStock, imageUrl: p.imageUrl ?? "", isActive: p.isActive,
    })
    setOpen(true)
  }

  const onSubmit = async (data: ProdutoInput) => {
    const url = editing ? `/api/produtos/${editing.id}` : "/api/produtos"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (res.ok) {
      toast({ title: editing ? "Produto atualizado!" : "Produto criado!", variant: "success" as never })
      setOpen(false)
      loadProducts()
    } else {
      const err = await res.json()
      toast({ title: "Erro", description: err.error ?? "Tente novamente", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id)
    const ok = await confirmDialog({
      title: "Remover produto?",
      text: product ? `O produto "${product.name}" será removido.` : undefined,
      confirmText: "Remover",
      danger: true,
      icon: "warning",
    })
    if (!ok) return

    setDeleting(id)
    const res = await fetch(`/api/produtos/${id}`, { method: "DELETE" })
    setDeleting(null)
    if (res.ok) {
      toast({ title: "Produto removido!" })
      loadProducts()
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === "all" || p.categoryId === filterCategory
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 text-sm">{products.length} produtos cadastrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome ou código..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Package className="w-10 h-10" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Preço</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Estoque</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{p.category.name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(Number(p.price))}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={p.stock <= p.minStock ? "text-red-600 font-semibold" : "text-gray-700"}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={p.isActive ? "success" : "secondary"}>
                          {p.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} disabled={deleting === p.id}>
                            {deleting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Código *</Label>
                <Input {...register("code")} placeholder="EX: GAL001" />
                {errors.code && <p className="text-red-500 text-xs">{errors.code.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input {...register("name")} placeholder="Nome do produto" />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Categoria *</Label>
              <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-red-500 text-xs">{errors.categoryId.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <textarea {...register("description")} rows={2} placeholder="Descrição opcional" className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Preço de Venda (R$) *</Label>
                <Input {...register("price")} type="number" step="0.01" min="0" />
                {errors.price && <p className="text-red-500 text-xs">{errors.price.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Custo (R$)</Label>
                <Input {...register("cost")} type="number" step="0.01" min="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Estoque Atual</Label>
                <Input {...register("stock")} type="number" min="0" />
              </div>
              <div className="space-y-1">
                <Label>Estoque Mínimo</Label>
                <Input {...register("minStock")} type="number" min="0" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} className="rounded" />
              <Label htmlFor="isActive">Produto ativo</Label>
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
