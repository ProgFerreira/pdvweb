"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { abrirCaixaSchema, movimentoCaixaSchema, type AbrirCaixaInput, type MovimentoCaixaInput } from "@/schemas/caixa"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { DollarSign, TrendingUp, TrendingDown, Lock, Unlock, Plus, Loader2, CreditCard, ArrowLeft } from "lucide-react"
import type { CashRegister, CashMovement } from "@/types"

type CashRegisterWithDetails = CashRegister & {
  movements: CashMovement[]
  _count: { sales: number }
}

export default function CaixaPage() {
  const { toast } = useToast()
  const [openCash, setOpenCash] = useState<CashRegisterWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [openAbrirDialog, setOpenAbrirDialog] = useState(false)
  const [openMovimentoDialog, setOpenMovimentoDialog] = useState(false)
  const [openFecharDialog, setOpenFecharDialog] = useState(false)
  const [countedCash, setCountedCash] = useState("")
  const [closeNotes, setCloseNotes] = useState("")

  const abrirForm = useForm<AbrirCaixaInput>({ resolver: zodResolver(abrirCaixaSchema) })
  const movForm = useForm<MovimentoCaixaInput & { cashRegisterId?: string }>({
    resolver: zodResolver(movimentoCaixaSchema),
    defaultValues: { type: "SAIDA" },
  })

  const loadCash = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/caixa/atual")
      const data = await res.json()
      if (!res.ok || data?.error || data?.success === false) {
        setOpenCash(null)
        return
      }
      const cash = data?.data ?? data
      if (!cash?.id) {
        setOpenCash(null)
        return
      }
      setOpenCash({
        ...cash,
        movements: cash.movements ?? [],
        _count: { sales: cash._count?.sales ?? 0 },
      })
    } catch {
      setOpenCash(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCash() }, [])

  const handleAbrir = async (data: AbrirCaixaInput) => {
    const res = await fetch("/api/caixa/abrir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (res.ok) { toast({ title: "Caixa aberto!" }); setOpenAbrirDialog(false); loadCash() }
    else { const err = await res.json(); toast({ title: "Erro", description: err.error, variant: "destructive" }) }
  }

  const handleMovimento = async (data: MovimentoCaixaInput) => {
    const res = await fetch("/api/caixa/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, cashRegisterId: openCash!.id }),
    })
    if (res.ok) { toast({ title: `${data.type === "ENTRADA" ? "Entrada" : "Sangria"} registrada!` }); setOpenMovimentoDialog(false); loadCash() }
    else { const err = await res.json(); toast({ title: "Erro", description: err.error, variant: "destructive" }) }
  }

  const expectedCash = openCash
    ? Number(openCash.initialAmount) + Number(openCash.totalCash)
    : 0

  const handleFechar = async () => {
    const counted = parseFloat(countedCash)
    if (isNaN(counted) || counted < 0) {
      toast({ title: "Informe o dinheiro contado", variant: "destructive" })
      return
    }
    const res = await fetch("/api/caixa/fechar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cashRegisterId: openCash!.id,
        countedCash: counted,
        closeNotes: closeNotes || undefined,
      }),
    })
    if (res.ok) { toast({ title: "Caixa fechado!" }); setOpenFecharDialog(false); loadCash() }
    else { const err = await res.json(); toast({ title: "Erro", description: err.error, variant: "destructive" }) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/caixa" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Voltar ao histórico
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Operação de Caixa</h1>
          <p className="text-gray-500 text-sm">{openCash ? "Caixa aberto" : "Nenhum caixa aberto"}</p>
        </div>
        {!openCash ? (
          <Button onClick={() => setOpenAbrirDialog(true)} variant="success">
            <Unlock className="w-4 h-4" /> Abrir Caixa
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenMovimentoDialog(true)}>
              <Plus className="w-4 h-4" /> Movimento
            </Button>
            <Button variant="destructive" onClick={() => setOpenFecharDialog(true)}>
              <Lock className="w-4 h-4" /> Fechar Caixa
            </Button>
          </div>
        )}
      </div>

      {openCash ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Saldo Inicial", value: Number(openCash.initialAmount), icon: DollarSign, color: "text-gray-700" },
              { label: "Dinheiro", value: Number(openCash.totalCash), icon: DollarSign, color: "text-green-700" },
              { label: "Pix", value: Number(openCash.totalPix), icon: CreditCard, color: "text-blue-700" },
              { label: "Débito", value: Number(openCash.totalDebit), icon: CreditCard, color: "text-indigo-700" },
              { label: "Crédito", value: Number(openCash.totalCredit), icon: CreditCard, color: "text-purple-700" },
              { label: "Vale", value: Number(openCash.totalVoucher), icon: CreditCard, color: "text-amber-700" },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Total de Vendas</p>
                  <p className="text-3xl font-bold text-green-800">{formatCurrency(Number(openCash.totalSales))}</p>
                  <p className="text-xs text-green-600 mt-1">{openCash._count?.sales ?? 0} vendas — Aberto desde {formatDateTime(openCash.openedAt)}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {(openCash.movements ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Movimentos</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Horário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(openCash.movements ?? []).map((m) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Badge variant={m.type === "ENTRADA" ? "success" : "warning"}>
                            {m.type === "ENTRADA" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {m.type === "ENTRADA" ? "Entrada" : "Sangria"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{m.description}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${m.type === "ENTRADA" ? "text-green-700" : "text-red-600"}`}>
                          {m.type === "ENTRADA" ? "+" : "-"}{formatCurrency(Number(m.amount))}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">{formatDateTime(m.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <Lock className="w-12 h-12" />
            <p className="text-lg font-medium">Caixa fechado</p>
            <p className="text-sm">Abra o caixa para começar a vender</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog — Abrir Caixa */}
      <Dialog open={openAbrirDialog} onOpenChange={setOpenAbrirDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <form onSubmit={abrirForm.handleSubmit(handleAbrir)} className="space-y-4">
            <div className="space-y-1">
              <Label>Valor Inicial (R$)</Label>
              <Input {...abrirForm.register("initialAmount")} type="number" step="0.01" min="0" placeholder="0,00" />
              {abrirForm.formState.errors.initialAmount && <p className="text-red-500 text-xs">{abrirForm.formState.errors.initialAmount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea {...abrirForm.register("notes")} rows={2} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAbrirDialog(false)}>Cancelar</Button>
              <Button type="submit" variant="success"><Unlock className="w-4 h-4" /> Abrir Caixa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog — Movimento */}
      <Dialog open={openMovimentoDialog} onOpenChange={setOpenMovimentoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Movimento</DialogTitle></DialogHeader>
          <form onSubmit={movForm.handleSubmit(handleMovimento)} className="space-y-4">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={movForm.watch("type")} onValueChange={(v) => movForm.setValue("type", v as "ENTRADA" | "SAIDA")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Sangria / Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input {...movForm.register("amount")} type="number" step="0.01" min="0" />
              {movForm.formState.errors.amount && <p className="text-red-500 text-xs">{movForm.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input {...movForm.register("description")} placeholder="Ex: Troco inicial, Pagamento fornecedor..." />
              {movForm.formState.errors.description && <p className="text-red-500 text-xs">{movForm.formState.errors.description.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenMovimentoDialog(false)}>Cancelar</Button>
              <Button type="submit">Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog — Fechar Caixa */}
      <Dialog open={openFecharDialog} onOpenChange={setOpenFecharDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">Informe o dinheiro contado para conferência com o sistema.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dinheiro esperado:</span>
                <span className="font-semibold">{formatCurrency(expectedCash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total de Vendas:</span>
                <span className="font-semibold">{openCash && formatCurrency(Number(openCash.totalSales))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Vendas realizadas:</span>
                <span className="font-semibold">{openCash?._count.sales ?? 0}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Dinheiro contado (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} />
            </div>
            {countedCash && (
              <p className="text-sm font-medium text-amber-600">
                Diferença: {formatCurrency(parseFloat(countedCash) - expectedCash)}
              </p>
            )}
            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={2} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFecharDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleFechar}><Lock className="w-4 h-4" /> Fechar Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
