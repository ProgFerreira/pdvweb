"use client"

import { useEffect, useState, useCallback } from "react"
import { formatDateTime } from "@/lib/utils"
import { Flame } from "lucide-react"
import type { SaleWithRelations } from "@/types"

type SaleStatus = "AGUARDANDO" | "EM_PREPARO" | "PRONTO"
type KitchenSector = "GERAL" | "GRELHA" | "ACOMPANHAMENTOS" | "BEBIDAS" | "SOBREMESAS"

const COLS: { status: SaleStatus; label: string; color: string; text: string }[] = [
  { status: "AGUARDANDO", label: "Aguardando", color: "bg-amber-500", text: "text-white" },
  { status: "EM_PREPARO", label: "Em Preparo", color: "bg-blue-600", text: "text-white" },
  { status: "PRONTO", label: "Pronto!", color: "bg-green-600", text: "text-white" },
]

const SECTORS: { value: KitchenSector | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos os setores" },
  { value: "GERAL", label: "Geral" },
  { value: "GRELHA", label: "Grelha" },
  { value: "ACOMPANHAMENTOS", label: "Acompanhamentos" },
  { value: "BEBIDAS", label: "Bebidas" },
  { value: "SOBREMESAS", label: "Sobremesas" },
]

export default function PainelPage() {
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [now, setNow] = useState(new Date())
  const [sector, setSector] = useState<KitchenSector | "TODOS">("TODOS")

  const load = useCallback(async () => {
    const res = await fetch("/api/vendas?pageSize=100")
    const data = await res.json()
    const all: SaleWithRelations[] = data.data ?? []
    setSales(all.filter((s) => ["AGUARDANDO", "EM_PREPARO", "PRONTO"].includes(s.status)))
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 10000)
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(iv); clearInterval(clock) }
  }, [load])

  /** Filtra os itens da venda pelo setor selecionado */
  const filterItems = (sale: SaleWithRelations) => {
    if (sector === "TODOS") return sale.items
    return sale.items.filter(
      (item) =>
        item.product.kitchenSector === sector ||
        item.product.kitchenSector === "GERAL" ||
        item.product.kitchenSector === null
    )
  }

  /** Só mostra vendas que têm ao menos 1 item relevante para o setor */
  const visibleSales = (status: SaleStatus) =>
    sales
      .filter((s) => s.status === status)
      .filter((s) => filterItems(s).length > 0)

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">PDV Galetos — Painel de Pedidos</h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold font-mono">{now.toLocaleTimeString("pt-BR")}</p>
          <p className="text-slate-400 text-sm">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
      </div>

      {/* Filtro de setor */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {SECTORS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSector(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sector === value
                ? "bg-orange-500 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {COLS.map(({ status, label, color, text }) => {
          const items = visibleSales(status)
          return (
            <div key={status} className="flex flex-col gap-3">
              <div className={`${color} rounded-xl px-4 py-3 flex items-center justify-between`}>
                <span className={`${text} font-bold text-xl`}>{label}</span>
                <span className={`${text} text-3xl font-black`}>{items.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-260px)]">
                {items.map((sale) => {
                  const saleItems = filterItems(sale)
                  return (
                    <div
                      key={sale.id}
                      className={`rounded-xl p-4 ${
                        status === "PRONTO"
                          ? "bg-green-900 border-2 border-green-500 animate-pulse"
                          : "bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-4xl font-black text-white">#{sale.orderNumber}</span>
                        <span className="text-slate-400 text-xs">{formatDateTime(sale.createdAt)}</span>
                      </div>
                      {sale.customer && (
                        <p className="text-slate-300 text-sm mb-2">{sale.customer.name}</p>
                      )}
                      <div className="space-y-1">
                        {saleItems.map((item) => (
                          <div key={item.id} className="text-sm text-slate-300">
                            <span className="font-bold text-white">{item.quantity}x</span>{" "}
                            {item.product.name}
                            {item.product.kitchenSector && item.product.kitchenSector !== "GERAL" && sector === "TODOS" && (
                              <span className="ml-1 text-xs text-slate-500">
                                [{item.product.kitchenSector}]
                              </span>
                            )}
                            {item.notes && (
                              <p className="text-xs text-orange-400 ml-4">↳ {item.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl text-slate-600 text-sm">
                    Nenhum pedido
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
