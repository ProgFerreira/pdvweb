"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { categoriaSchema, type CategoriaInput } from "@/schemas/categoria"
import { useToast } from "@/hooks/use-toast"
import { canDo } from "@/lib/client-permissions"
import { useSession } from "next-auth/react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Tags, Loader2, Pencil } from "lucide-react"
import type { Category } from "@/types"

export default function CategoriasPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const canEdit = canDo(session?.user?.role, "categorias.crud")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { isActive: true, color: "#f97316" },
  })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/categorias?activeOnly=false")
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    reset({ name: "", description: "", color: "#f97316", isActive: true })
    setOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    reset({
      name: cat.name,
      description: cat.description ?? "",
      color: cat.color ?? "#f97316",
      isActive: cat.isActive,
    })
    setOpen(true)
  }

  const onSubmit = async (data: CategoriaInput) => {
    const url = editing ? `/api/categorias/${editing.id}` : "/api/categorias"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      toast({ variant: "destructive", title: "Erro", description: err.error ?? "Falha ao salvar" })
      return
    }
    toast({ title: editing ? "Categoria atualizada" : "Categoria criada" })
    setOpen(false)
    load()
  }

  return (
    <div>
      <PageHeader title="Categorias" description={`${categories.length} categorias`}>
        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Nova categoria
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <EmptyState icon={Tags} title="Nenhuma categoria" />
          ) : (
            <div className="divide-y">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color ?? "#6366f1" }}
                    />
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" {...register("description")} />
            </div>
            <div>
              <Label htmlFor="color">Cor</Label>
              <Input id="color" type="color" {...register("color")} className="h-10 w-20" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
