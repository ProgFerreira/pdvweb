"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { mesaSchema, type MesaInput } from "@/schemas/mesa"
import { parseListResponse } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, LayoutGrid, Loader2 } from "lucide-react"

type Table = {
  id: string
  number: number
  name: string | null
  capacity: number
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  LIVRE: "Livre",
  OCUPADA: "Ocupada",
  RESERVADA: "Reservada",
}

export default function MesasPage() {
  const { toast } = useToast()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const form = useForm<MesaInput>({
    resolver: zodResolver(mesaSchema),
    defaultValues: { capacity: 4, status: "LIVRE", number: 1 },
  })
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = form

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/mesas")
    const data = await res.json()
    setTables(parseListResponse<Table>(data))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const onSubmit = async (data: MesaInput) => {
    const res = await fetch("/api/mesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast({ title: "Mesa cadastrada" })
      setOpen(false)
      reset({ capacity: 4, status: "LIVRE" })
      load()
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" })
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/mesas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" /> Mesas
          </h1>
          <p className="text-gray-500 text-sm">Mapa de mesas do salão</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nova mesa</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tables.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                t.status === "OCUPADA" ? "border-orange-400 bg-orange-50" :
                t.status === "RESERVADA" ? "border-blue-400 bg-blue-50" : "border-green-200 bg-green-50"
              }`}
              onClick={() => updateStatus(t.id, t.status === "LIVRE" ? "OCUPADA" : "LIVRE")}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">#{t.number}</p>
                {t.name && <p className="text-xs text-gray-500">{t.name}</p>}
                <Badge className="mt-2" variant="secondary">{STATUS_LABELS[t.status]}</Badge>
                <p className="text-xs text-gray-400 mt-1">{t.capacity} lugares</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova mesa</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Número</Label>
              <Input type="number" {...register("number")} />
            </div>
            <div className="space-y-1">
              <Label>Nome (opcional)</Label>
              <Input {...register("name")} />
            </div>
            <div className="space-y-1">
              <Label>Capacidade</Label>
              <Input type="number" {...register("capacity")} />
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
