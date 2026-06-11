"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { stockMovementSchema, type StockMovementInput } from "@/schemas/estoque"
import { formatDateTime, parseListResponse } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Warehouse } from "lucide-react"
import type { ProductWithCategory } from "@/types"

type Movement = {
  id: string
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  notes: string | null
  createdAt: string
  product: { name: string; code: string }
}

const TYPE_LABELS: Record<string, string> = {
  VENDA: "Venda",
  CANCELAMENTO: "Cancelamento",
  ENTRADA: "Entrada",
  AJUSTE: "Ajuste",
  PERDA: "Perda",
  COMPRA: "Compra",
}

export default function EstoquePage() {
  const { toast } = useToast()
  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: { type: "ENTRADA" },
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [movRes, prodRes] = await Promise.all([
      fetch("/api/estoque?pageSize=50"),
      fetch("/api/produtos?isActive=true&pageSize=200"),
    ])
    const movData = await movRes.json()
    const prodData = await prodRes.json()
    setMovements(parseListResponse<Movement>(movData))
    setProducts(parseListResponse<ProductWithCategory>(prodData))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const onSubmit = async (data: StockMovementInput) => {
    const res = await fetch("/api/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast({ title: "Movimentação registrada" })
      setOpen(false)
      reset({ type: "ENTRADA" })
      load()
    } else {
      const err = await res.json()
      toast({ title: "Erro", description: err.error, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6" /> Estoque
          </h1>
          <p className="text-gray-500 text-sm">Histórico de movimentações (kardex)</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nova movimentação</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas movimentações</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-40 items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Produto</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-right p-3">Qtd</th>
                    <th className="text-right p-3">Antes</th>
                    <th className="text-right p-3">Depois</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="p-3 text-gray-600">{formatDateTime(m.createdAt)}</td>
                      <td className="p-3">{m.product.name}</td>
                      <td className="p-3">{TYPE_LABELS[m.type] ?? m.type}</td>
                      <td className={`p-3 text-right font-medium ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                        {m.quantity > 0 ? "+" : ""}{m.quantity}
                      </td>
                      <td className="p-3 text-right">{m.stockBefore}</td>
                      <td className="p-3 text-right font-semibold">{m.stockAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Movimentação de estoque</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Produto</Label>
              <Select value={watch("productId")} onValueChange={(v) => setValue("productId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} (est: {p.stock})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as StockMovementInput["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="AJUSTE">Ajuste (+/-)</SelectItem>
                  <SelectItem value="PERDA">Perda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input type="number" {...register("quantity")} />
              {errors.quantity && <p className="text-red-500 text-xs">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Input {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
