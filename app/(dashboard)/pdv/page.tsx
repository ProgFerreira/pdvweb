"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { formatCurrency, parseListResponse } from "@/lib/utils"
import { confirmDialog, useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search, Plus, Minus, ShoppingCart, CreditCard, Printer,
  X, Check, User, AlertCircle, MapPin, Phone, Wifi, WifiOff, RefreshCw,
} from "lucide-react"
import type {
  ProductWithCategory, Category, Customer, CartItem, CartPayment, PaymentMethod, PdvSession, OrderType, CustomerHistory, PdvDeliveryInfo,
} from "@/types"

const EMPTY_DELIVERY: PdvDeliveryInfo = {
  address: "",
  neighborhood: "",
  city: "",
  complement: "",
  reference: "",
}

const PAYMENT_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro", PIX: "Pix", DEBITO: "Débito", CREDITO: "Crédito", VALE: "Vale/Refeição",
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  BALCAO: "Balcão",
  RETIRADA: "Retirada",
  DELIVERY_PROPRIO: "Delivery",
}

function deliveryFromCustomer(c: Customer): PdvDeliveryInfo {
  return {
    address: c.address ?? "",
    neighborhood: c.neighborhood ?? "",
    city: c.city ?? "",
    complement: "",
    reference: "",
  }
}

function createSession(label: string): PdvSession {
  return {
    id: crypto.randomUUID(),
    label,
    cart: [],
    selectedCustomer: null,
    customerSearch: "",
    guestName: "",
    guestPhone: "",
    delivery: { ...EMPTY_DELIVERY },
    discount: 0,
    addition: 0,
    waiveServiceFee: false,
    loyaltyPointsToRedeem: 0,
    orderType: "BALCAO",
    notes: "",
    payments: [{ method: "DINHEIRO" as PaymentMethod, amount: 0 }],
    lastOrder: null,
  }
}

export default function PDVPage() {
  const { toast } = useToast()

  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sessions, setSessions] = useState<PdvSession[]>(() => [createSession("Caixa 1")])
  const [activeSessionId, setActiveSessionId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [cashRegisterId, setCashRegisterId] = useState<string | null>(null)
  const [openCash, setOpenCash] = useState<{ id: string; status: string } | null>(null)
  const [finalizingOrder, setFinalizingOrder] = useState(false)
  const [serviceFeePercent, setServiceFeePercent] = useState(0)
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null)
  const [stoneEnabled, setStoneEnabled] = useState(false)
  const [stoneDialogOpen, setStoneDialogOpen] = useState(false)
  const [stoneStatus, setStoneStatus] = useState<"pending" | "approved" | "failed" | "cancelled" | "timeout">("pending")
  const [stoneTransactionId, setStoneTransactionId] = useState<string | null>(null)
  const [stonePollRef, setStonePollRef] = useState<ReturnType<typeof setInterval> | null>(null)

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  )

  useEffect(() => {
    if (!activeSessionId && sessions[0]) setActiveSessionId(sessions[0].id)
  }, [activeSessionId, sessions])

  const updateSession = useCallback((sessionId: string, updater: (s: PdvSession) => PdvSession) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updater(s) : s)))
  }, [])

  const updateActive = useCallback(
    (updater: (s: PdvSession) => PdvSession) => {
      if (!activeSession) return
      updateSession(activeSession.id, updater)
    },
    [activeSession, updateSession]
  )

  useEffect(() => {
    Promise.all([
      fetch("/api/produtos?isActive=true").then((r) => r.json()),
      fetch("/api/categorias").then((r) => r.json()),
      fetch("/api/caixa/atual").then((r) => r.json()),
      fetch("/api/pdv/settings").then((r) => r.json()),
    ]).then(([prods, cats, cash, pdvSettings]) => {
      setProducts(parseListResponse<ProductWithCategory>(prods))
      setCategories(parseListResponse<Category>(cats))
      const register = cash?.data ?? cash
      if (register?.id) { setOpenCash(register); setCashRegisterId(register.id) }
      const settings = pdvSettings?.data ?? pdvSettings
      if (settings?.serviceFee != null) setServiceFeePercent(Number(settings.serviceFee))
      if (settings?.stoneEnabled) setStoneEnabled(true)
    })
  }, [])

  // Polling do caixa a cada 60s — detecta fechamento enquanto operador está com carrinho aberto
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/caixa/atual")
        const data = await res.json()
        const register = data?.data ?? data
        if (register?.id) {
          setOpenCash(register)
          setCashRegisterId(register.id)
        } else {
          setOpenCash(null)
          setCashRegisterId(null)
        }
      } catch {
        // ignora falhas de rede no polling
      }
    }
    const interval = setInterval(poll, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!activeSession || activeSession.customerSearch.length < 2) return
    const timer = setTimeout(() => {
      fetch(`/api/clientes?search=${activeSession.customerSearch}`)
        .then((r) => r.json())
        .then((d) => setCustomers(parseListResponse<Customer>(d)))
    }, 300)
    return () => clearTimeout(timer)
  }, [activeSession?.customerSearch, activeSession])

  const filteredProducts = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
    const matchCat = selectedCategory === "all" || p.categoryId === selectedCategory
    return matchSearch && matchCat
  })

  const addToCart = (product: ProductWithCategory) => {
    if (!activeSession) return
    updateActive((s) => {
      const existing = s.cart.find((i) => i.productId === product.id)
      const cart = existing
        ? s.cart.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice - i.discount }
              : i
          )
        : [
            ...s.cart,
            {
              productId: product.id,
              name: product.name,
              code: product.code,
              unitPrice: Number(product.price),
              quantity: 1,
              discount: 0,
              total: Number(product.price),
            },
          ]
      return { ...s, cart }
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    updateActive((s) => ({
      ...s,
      cart: s.cart.map((i) => {
        if (i.productId !== productId) return i
        const qty = Math.max(1, i.quantity + delta)
        return { ...i, quantity: qty, total: qty * i.unitPrice - i.discount }
      }),
    }))
  }

  const removeItem = (productId: string) => {
    updateActive((s) => ({ ...s, cart: s.cart.filter((i) => i.productId !== productId) }))
  }

  const updateItemNotes = (productId: string, notes: string) => {
    updateActive((s) => ({
      ...s,
      cart: s.cart.map((i) => (i.productId === productId ? { ...i, notes } : i)),
    }))
  }

  const cart = activeSession?.cart ?? []
  const discount = activeSession?.discount ?? 0
  const addition = activeSession?.addition ?? 0
  const waiveServiceFee = activeSession?.waiveServiceFee ?? false
  const loyaltyPointsToRedeem = activeSession?.loyaltyPointsToRedeem ?? 0
  const orderType = activeSession?.orderType ?? "BALCAO"
  const notes = activeSession?.notes ?? ""
  const payments = activeSession?.payments ?? []
  const selectedCustomer = activeSession?.selectedCustomer ?? null
  const customerSearch = activeSession?.customerSearch ?? ""
  const guestName = activeSession?.guestName ?? ""
  const guestPhone = activeSession?.guestPhone ?? ""
  const delivery = activeSession?.delivery ?? EMPTY_DELIVERY
  const lastOrder = activeSession?.lastOrder ?? null

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerHistory(null)
      return
    }
    fetch(`/api/clientes/${selectedCustomer.id}/historico`)
      .then((r) => r.json())
      .then((d) => {
        const data = d?.data ?? d
        if (data?.sales) setCustomerHistory(data)
      })
      .catch(() => setCustomerHistory(null))
  }, [selectedCustomer?.id])

  const subtotal = cart.reduce((acc, i) => acc + i.total, 0)
  const serviceFeeAmount =
    !waiveServiceFee && serviceFeePercent > 0
      ? Math.round((subtotal * serviceFeePercent) / 100 * 100) / 100
      : 0
  const loyaltyDiscount = Math.round((loyaltyPointsToRedeem / 100) * 100) / 100
  const total = Math.max(0, subtotal - discount - loyaltyDiscount + addition + serviceFeeAmount)
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
  const change = Math.max(0, totalPaid - total)

  const clearActiveSession = () => {
    if (!activeSession) return
    updateActive((s) => ({
      ...s,
      cart: [],
      discount: 0,
      addition: 0,
      waiveServiceFee: false,
      loyaltyPointsToRedeem: 0,
      orderType: "BALCAO",
      notes: "",
      selectedCustomer: null,
      customerSearch: "",
      guestName: "",
      guestPhone: "",
      delivery: { ...EMPTY_DELIVERY },
      payments: [{ method: "DINHEIRO" as PaymentMethod, amount: 0 }],
      lastOrder: null,
    }))
  }

  const repeatOrder = (sale: CustomerHistory["sales"][0]) => {
    if (!activeSession) return
    const newCart = sale.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product) return null
      const unitPrice = Number(product.price)
      return {
        productId: product.id,
        name: product.name,
        code: product.code,
        unitPrice,
        quantity: item.quantity,
        discount: 0,
        total: unitPrice * item.quantity,
      }
    }).filter(Boolean) as CartItem[]
    if (newCart.length === 0) {
      toast({ title: "Não foi possível repetir", description: "Produtos indisponíveis", variant: "destructive" })
      return
    }
    updateActive((s) => ({ ...s, cart: newCart }))
    toast({ title: "Pedido carregado no carrinho" })
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !search.trim()) return
    const term = search.trim().toLowerCase()
    const exact = products.find(
      (p) => p.code.toLowerCase() === term || (p.barcode && p.barcode.toLowerCase() === term)
    )
    if (exact) {
      addToCart(exact)
      setSearch("")
    }
  }

  const addNewSession = () => {
    const num = sessions.length + 1
    const newSession = createSession(`Caixa ${num}`)
    setSessions((prev) => [...prev, newSession])
    setActiveSessionId(newSession.id)
    setCustomers([])
  }

  const removeSession = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (!session || sessions.length <= 1) return
    if (session.cart.length > 0) {
      const ok = await confirmDialog({
        title: `Fechar ${session.label}?`,
        text: "O carrinho será descartado.",
        confirmText: "Fechar",
        icon: "warning",
      })
      if (!ok) return
    }

    const remaining = sessions.filter((s) => s.id !== sessionId)
    setSessions(remaining)
    if (activeSessionId === sessionId) setActiveSessionId(remaining[0].id)
  }

  const buildOrderPayload = (extraPayments?: CartPayment[]) => ({
    customerId: selectedCustomer?.id,
    customerName: selectedCustomer ? selectedCustomer.name : guestName.trim() || undefined,
    customerPhone: selectedCustomer ? selectedCustomer.phone : guestPhone.trim() || undefined,
    ...(orderType === "DELIVERY_PROPRIO"
      ? {
          deliveryAddress: delivery.address.trim() || undefined,
          deliveryNeighborhood: delivery.neighborhood.trim() || undefined,
          deliveryCity: delivery.city.trim() || undefined,
          deliveryComplement: delivery.complement.trim() || undefined,
          deliveryReference: delivery.reference.trim() || undefined,
        }
      : {}),
    cashRegisterId,
    orderType,
    waiveServiceFee,
    discount,
    addition,
    loyaltyPointsToRedeem,
    notes,
    items: cart.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      notes: i.notes,
    })),
    payments: (extraPayments ?? payments).map((p) => ({
      method: p.method,
      amount: p.amount,
      stoneTransactionId: (p as CartPayment & { stoneTransactionId?: string }).stoneTransactionId,
      stoneStatus: (p as CartPayment & { stoneStatus?: string }).stoneStatus,
      stoneAuthCode: (p as CartPayment & { stoneAuthCode?: string }).stoneAuthCode,
      stoneNsu: (p as CartPayment & { stoneNsu?: string }).stoneNsu,
      stoneInstallments: (p as CartPayment & { stoneInstallments?: number }).stoneInstallments,
    })),
  })

  const handleOrderSuccess = (sale: { id: string; orderNumber: number }) => {
    updateActive((s) => ({ ...s, lastOrder: { id: sale.id, orderNumber: sale.orderNumber } }))
    setPaymentOpen(false)
    toast({
      title: `${activeSession?.label}: Pedido #${sale.orderNumber} criado!`,
      description: change > 0 ? `Troco: ${formatCurrency(change)}` : "Venda realizada com sucesso",
    })
    updateActive((s) => ({
      ...s,
      cart: [],
      discount: 0,
      addition: 0,
      waiveServiceFee: false,
      loyaltyPointsToRedeem: 0,
      orderType: "BALCAO",
      notes: "",
      selectedCustomer: null,
      customerSearch: "",
      guestName: "",
      guestPhone: "",
      delivery: { ...EMPTY_DELIVERY },
      payments: [{ method: "DINHEIRO" as PaymentMethod, amount: 0 }],
    }))
    setCustomerHistory(null)
  }

  const stopStonePoll = () => {
    setStonePollRef((ref) => {
      if (ref) clearInterval(ref)
      return null
    })
  }

  const cancelStoneTransaction = async (txId: string) => {
    try {
      await fetch("/api/stone/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId }),
      })
    } catch { /* ignora erro ao cancelar */ }
  }

  const handleStoneCancelByUser = async () => {
    stopStonePoll()
    if (stoneTransactionId) await cancelStoneTransaction(stoneTransactionId)
    setStoneDialogOpen(false)
    setStoneTransactionId(null)
    setStoneStatus("pending")
    setFinalizingOrder(false)
  }

  const startStonePoll = (txId: string, pendingSaleId: string, pendingOrderNumber: number) => {
    let attempts = 0
    const MAX_ATTEMPTS = 60 // 2 min com intervalo de 2s

    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/stone/transaction?id=${encodeURIComponent(txId)}`)
        if (!res.ok) return

        const tx = await res.json() as { status: string; authCode?: string; nsu?: string }

        if (tx.status === "approved") {
          clearInterval(interval)
          setStonePollRef(null)
          setStoneStatus("approved")
          setTimeout(() => {
            setStoneDialogOpen(false)
            setStoneTransactionId(null)
            setStoneStatus("pending")
            setFinalizingOrder(false)
            handleOrderSuccess({ id: pendingSaleId, orderNumber: pendingOrderNumber })
          }, 1500)
        } else if (["failed", "cancelled", "timeout"].includes(tx.status)) {
          clearInterval(interval)
          setStonePollRef(null)
          setStoneStatus(tx.status as "failed" | "cancelled" | "timeout")
          setFinalizingOrder(false)
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval)
          setStonePollRef(null)
          setStoneStatus("timeout")
          setFinalizingOrder(false)
        }
      } catch { /* continua polling */ }
    }, 2000)

    setStonePollRef(interval)
  }

  const finalizeWithStone = async () => {
    if (!activeSession) return
    setFinalizingOrder(true)

    const stonePayments = payments.filter((p) => p.method === "DEBITO" || p.method === "CREDITO")
    if (stonePayments.length === 0) {
      setFinalizingOrder(false)
      return
    }

    const stonePayment = stonePayments[0]
    const amountCentavos = Math.round(stonePayment.amount * 100)

    const txRes = await fetch("/api/stone/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountCentavos,
        paymentType: stonePayment.method === "DEBITO" ? "debit" : "credit",
        orderId: `pdv-${Date.now()}`,
        description: `Pedido PDV`,
      }),
    })

    if (!txRes.ok) {
      const err = await txRes.json()
      toast({ title: "Erro ao comunicar com Stone", description: err.error ?? "Tente novamente", variant: "destructive" })
      setFinalizingOrder(false)
      return
    }

    const { transactionId } = await txRes.json() as { transactionId: string }
    setStoneTransactionId(transactionId)
    setStoneStatus("pending")
    setPaymentOpen(false)
    setStoneDialogOpen(true)

    // Criar venda pendente no banco
    const paymentsWithStone = payments.map((p) =>
      (p.method === "DEBITO" || p.method === "CREDITO")
        ? { ...p, stoneTransactionId: transactionId, stoneStatus: "pending" }
        : p
    )

    const saleRes = await fetch("/api/stone/pending-sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildOrderPayload(paymentsWithStone as CartPayment[])),
    })

    if (!saleRes.ok) {
      stopStonePoll()
      await cancelStoneTransaction(transactionId)
      setStoneDialogOpen(false)
      setStoneTransactionId(null)
      setFinalizingOrder(false)
      const err = await saleRes.json()
      toast({ title: "Erro ao criar pedido", description: err.error ?? "Tente novamente", variant: "destructive" })
      return
    }

    const pendingSale = await saleRes.json() as { id: string; orderNumber: number }
    startStonePoll(transactionId, pendingSale.id, pendingSale.orderNumber)
  }

  const finalizeOrder = async () => {
    if (!activeSession) return
    if (cart.length === 0) return toast({ title: "Carrinho vazio", description: "Adicione produtos antes de finalizar", variant: "destructive" })
    if (!openCash) return toast({ title: "Caixa fechado", description: "Abra o caixa antes de vender", variant: "destructive" })
    if (totalPaid < total) return toast({ title: "Pagamento insuficiente", description: `Falta ${formatCurrency(total - totalPaid)}`, variant: "destructive" })

    // Pagamento via maquininha Stone
    const hasCardPayment = payments.some((p) => p.method === "DEBITO" || p.method === "CREDITO")
    if (stoneEnabled && hasCardPayment) {
      await finalizeWithStone()
      return
    }

    setFinalizingOrder(true)
    const res = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildOrderPayload()),
    })

    setFinalizingOrder(false)
    if (res.ok) {
      const sale = await res.json()
      handleOrderSuccess(sale)
    } else {
      const err = await res.json()
      toast({ title: "Erro ao finalizar", description: err.error ?? "Tente novamente", variant: "destructive" })
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Painel esquerdo — produtos */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {!openCash && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-800 text-sm font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              {cart.length > 0
                ? "⚠️ Caixa fechado enquanto você tinha itens no carrinho. "
                : "Caixa fechado. "}
              <a href="/caixa" className="underline">Abra o caixa</a> para continuar vendendo.
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar ou código de barras (Enter)..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === c.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 content-start">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white border border-gray-200 rounded-lg p-2 text-left hover:border-blue-400 hover:shadow-sm transition-all group"
            >
              <div className="w-full h-10 bg-orange-50 rounded flex items-center justify-center mb-1 group-hover:bg-orange-100 transition-colors">
                <span className="text-base leading-none">🍗</span>
              </div>
              <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{p.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{p.code}</p>
              <p className="text-xs font-bold text-green-700 mt-0.5">{formatCurrency(Number(p.price))}</p>
              {p.stock <= p.minStock && (
                <p className="text-[10px] text-red-500 mt-0.5">Est: {p.stock}</p>
              )}
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full flex items-center justify-center h-32 text-gray-400 text-sm">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>

      {/* Painel direito — carrinho + fila de caixas */}
      <div className="w-80 flex flex-col gap-2 bg-white border border-gray-200 rounded-xl p-3 min-h-0">
        {/* Fila de caixas */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 shrink-0">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId
            const itemCount = s.cart.reduce((acc, i) => acc + i.quantity, 0)
            return (
              <div
                key={s.id}
                className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <button type="button" onClick={() => { setActiveSessionId(s.id); setCustomers([]) }} className="flex items-center gap-1">
                  {s.label}
                  {itemCount > 0 && (
                    <span className={`min-w-[1.1rem] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isActive ? "bg-white/25 text-white" : "bg-blue-100 text-blue-700"
                    }`}>
                      {itemCount}
                    </span>
                  )}
                </button>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSession(s.id) }}
                    className={`p-0.5 rounded hover:bg-black/10 ${isActive ? "text-white/80" : "text-gray-400"}`}
                    title={`Fechar ${s.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
          <button
            type="button"
            onClick={addNewSession}
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 border border-dashed border-blue-300 hover:bg-blue-50 whitespace-nowrap shrink-0"
            title="Novo atendimento"
          >
            <Plus className="w-3 h-3" /> Novo
          </button>
        </div>

        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <ShoppingCart className="w-4 h-4" /> {activeSession?.label ?? "Carrinho"}
          </h2>
          {cart.length > 0 && (
            <button onClick={clearActiveSession} className="text-xs text-red-500 hover:text-red-700">Limpar</button>
          )}
        </div>

        {/* Tipo de pedido */}
        <div className="shrink-0">
          <Select
            value={orderType}
            onValueChange={(v) => {
              const newType = v as OrderType
              updateActive((s) => ({
                ...s,
                orderType: newType,
                ...(newType !== "DELIVERY_PROPRIO" ? { delivery: { ...EMPTY_DELIVERY } } : {}),
              }))
            }}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cliente e entrega (opcional) */}
        <div className="shrink-0 space-y-2 border border-gray-100 rounded-lg p-2 bg-gray-50/50">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Cliente (opcional)</p>
          <div className="relative">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {selectedCustomer ? (
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="text-sm font-medium truncate">{selectedCustomer.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateActive((s) => ({
                      ...s,
                      selectedCustomer: null,
                      customerSearch: "",
                      guestName: "",
                      guestPhone: "",
                      delivery: { ...EMPTY_DELIVERY },
                    }))
                  }
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <input
                value={customerSearch || guestName}
                onChange={(e) => {
                  const v = e.target.value
                  updateActive((s) => ({
                    ...s,
                    customerSearch: v,
                    guestName: v,
                  }))
                }}
                placeholder="Buscar ou digitar nome..."
                className="flex-1 text-sm outline-none bg-transparent min-w-0"
              />
            )}
            </div>
            {customers.length > 0 && customerSearch && !selectedCustomer && (
              <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      updateActive((s) => ({
                        ...s,
                        selectedCustomer: c,
                        customerSearch: "",
                        guestName: c.name,
                        guestPhone: c.phone ?? "",
                        delivery:
                          s.orderType === "DELIVERY_PROPRIO"
                            ? deliveryFromCustomer(c)
                            : s.delivery,
                      }))
                    }
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <p className="font-medium">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={selectedCustomer?.phone ?? guestPhone}
              onChange={(e) => updateActive((s) => ({ ...s, guestPhone: e.target.value }))}
              placeholder="Telefone (opcional)"
              className="flex-1 text-sm outline-none bg-transparent min-w-0"
              disabled={!!selectedCustomer?.phone}
            />
          </div>

          {orderType === "DELIVERY_PROPRIO" && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <MapPin className="w-3.5 h-3.5" />
                Endereço de entrega
              </p>
              <input
                value={delivery.address}
                onChange={(e) =>
                  updateActive((s) => ({
                    ...s,
                    delivery: { ...s.delivery, address: e.target.value },
                  }))
                }
                placeholder="Endereço"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-300"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  value={delivery.neighborhood}
                  onChange={(e) =>
                    updateActive((s) => ({
                      ...s,
                      delivery: { ...s.delivery, neighborhood: e.target.value },
                    }))
                  }
                  placeholder="Bairro"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-300"
                />
                <input
                  value={delivery.city}
                  onChange={(e) =>
                    updateActive((s) => ({
                      ...s,
                      delivery: { ...s.delivery, city: e.target.value },
                    }))
                  }
                  placeholder="Cidade"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-300"
                />
              </div>
              <input
                value={delivery.complement}
                onChange={(e) =>
                  updateActive((s) => ({
                    ...s,
                    delivery: { ...s.delivery, complement: e.target.value },
                  }))
                }
                placeholder="Complemento (opcional)"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-300"
              />
              <input
                value={delivery.reference}
                onChange={(e) =>
                  updateActive((s) => ({
                    ...s,
                    delivery: { ...s.delivery, reference: e.target.value },
                  }))
                }
                placeholder="Ponto de referência (opcional)"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-300"
              />
            </div>
          )}
        </div>

        {selectedCustomer && customerHistory && (
          <div className="shrink-0 bg-blue-50 border border-blue-100 rounded-lg p-2 text-xs space-y-1">
            <p className="font-medium text-blue-800">
              {customerHistory.orderCount} pedidos · {formatCurrency(customerHistory.totalSpent)}
              {customerHistory.loyaltyPoints > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 font-semibold">
                  {customerHistory.loyaltyPoints} pts
                </span>
              )}
            </p>
            {customerHistory.sales.slice(0, 2).map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => repeatOrder(sale)}
                className="w-full text-left text-blue-700 hover:underline"
              >
                Repetir #{sale.orderNumber}
              </button>
            ))}
          </div>
        )}

        {/* Itens */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <ShoppingCart className="w-8 h-8 mb-2" />
              <p className="text-sm">Carrinho vazio</p>
              <p className="text-xs">Clique nos produtos para adicionar</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="border border-gray-100 rounded-lg p-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} un.</p>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(item.total)}</span>
                </div>
                <input
                  value={item.notes ?? ""}
                  onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                  placeholder="Obs. do item..."
                  className="w-full mt-1.5 text-xs border border-gray-100 rounded px-2 py-1 bg-gray-50 outline-none focus:border-blue-300"
                />
              </div>
            ))
          )}
        </div>

        {/* Totais */}
        <div className="border-t border-gray-100 pt-3 space-y-2 shrink-0">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Desconto</span>
            <input
              type="number" min="0" step="0.01"
              value={discount || ""}
              onChange={(e) => updateActive((s) => ({ ...s, discount: Number(e.target.value) || 0 }))}
              placeholder="0,00"
              className="w-20 text-right text-sm border border-gray-200 rounded px-2 py-0.5 text-red-600"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Acréscimo</span>
            <input
              type="number" min="0" step="0.01"
              value={addition || ""}
              onChange={(e) => updateActive((s) => ({ ...s, addition: Number(e.target.value) || 0 }))}
              placeholder="0,00"
              className="w-20 text-right text-sm border border-gray-200 rounded px-2 py-0.5 text-blue-600"
            />
          </div>
          {serviceFeePercent > 0 && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-1 text-gray-600">
                <input
                  type="checkbox"
                  checked={!waiveServiceFee}
                  onChange={(e) => updateActive((s) => ({ ...s, waiveServiceFee: !e.target.checked }))}
                  className="rounded"
                />
                Taxa ({serviceFeePercent}%)
              </label>
              <span className={waiveServiceFee ? "text-gray-400 line-through" : ""}>
                {formatCurrency(serviceFeeAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
            <span>Total</span><span className="text-green-700">{formatCurrency(total)}</span>
          </div>
        </div>

        {lastOrder && (
          <button
            onClick={() => import("@/lib/open-print").then((m) => m.openPrintWindow(lastOrder.id))}
            className="flex items-center justify-center gap-2 w-full py-2 border border-blue-200 rounded-lg text-blue-600 text-sm hover:bg-blue-50 transition-colors shrink-0"
          >
            <Printer className="w-4 h-4" />
            Imprimir #{lastOrder.orderNumber}
          </button>
        )}

        <Button size="lg" className="w-full shrink-0" disabled={cart.length === 0 || !openCash} onClick={() => {
          // Preenche o primeiro pagamento com o total restante
          updateActive((s) => {
            const paid = s.payments.slice(1).reduce((acc, p) => acc + p.amount, 0)
            const remaining = Math.max(0, total - paid)
            return {
              ...s,
              payments: s.payments.map((p, i) => i === 0 ? { ...p, amount: remaining } : p),
            }
          })
          setPaymentOpen(true)
        }}>
          <CreditCard className="w-4 h-4" />
          {stoneEnabled ? "Pagamento / Stone" : "Pagamento"}
        </Button>
      </div>

      {/* Modal Stone — aguardando maquininha */}
      <Dialog open={stoneDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm text-center" aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Maquininha Stone</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {stoneStatus === "pending" && (
              <>
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Wifi className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Aguardando aprovação</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Passe o cartão na maquininha para concluir o pagamento.
                  </p>
                </div>
                <p className="text-xs text-gray-400">Total: {formatCurrency(total)}</p>
                <Button variant="outline" size="sm" onClick={handleStoneCancelByUser}>
                  Cancelar pagamento
                </Button>
              </>
            )}
            {stoneStatus === "approved" && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-700">Pagamento aprovado!</p>
                  <p className="text-sm text-gray-500 mt-1">Pedido confirmado com sucesso.</p>
                </div>
              </>
            )}
            {(stoneStatus === "failed" || stoneStatus === "cancelled" || stoneStatus === "timeout") && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <WifiOff className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-700">
                    {stoneStatus === "timeout" ? "Tempo esgotado" : "Pagamento recusado"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stoneStatus === "timeout"
                      ? "A maquininha não respondeu a tempo."
                      : "O pagamento foi recusado ou cancelado."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStoneDialogOpen(false)
                      setStoneTransactionId(null)
                      setStoneStatus("pending")
                      updateActive((s) => {
                        const paid = s.payments.slice(1).reduce((acc, p) => acc + p.amount, 0)
                        const remaining = Math.max(0, total - paid)
                        return {
                          ...s,
                          payments: s.payments.map((p, i) => i === 0 ? { ...p, amount: remaining } : p),
                        }
                      })
                      setPaymentOpen(true)
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Tentar novamente
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleStoneCancelByUser}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de pagamento */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar — {activeSession?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(selectedCustomer || guestName.trim() || delivery.address.trim()) && (
              <div className="text-sm text-gray-600 space-y-1 border border-gray-100 rounded-lg p-3 bg-white">
                {(selectedCustomer || guestName.trim()) && (
                  <p>
                    <span className="font-medium text-gray-800">Cliente:</span>{" "}
                    {selectedCustomer?.name ?? guestName.trim()}
                    {(selectedCustomer?.phone ?? guestPhone.trim()) && (
                      <span className="text-gray-500"> · {selectedCustomer?.phone ?? guestPhone}</span>
                    )}
                  </p>
                )}
                {orderType === "DELIVERY_PROPRIO" && delivery.address.trim() && (
                  <p className="text-xs text-gray-500">
                    <MapPin className="w-3 h-3 inline mr-0.5" />
                    {delivery.address}
                    {delivery.neighborhood && `, ${delivery.neighborhood}`}
                    {delivery.city && ` — ${delivery.city}`}
                  </p>
                )}
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-red-600 mb-1">
                  <span>Desconto</span><span>- {formatCurrency(discount)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm text-purple-600 mb-1">
                  <span>Fidelidade ({loyaltyPointsToRedeem} pts)</span>
                  <span>- {formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              {addition > 0 && (
                <div className="flex justify-between text-sm text-blue-600 mb-1">
                  <span>Acréscimo</span><span>+ {formatCurrency(addition)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl border-t border-gray-200 pt-2">
                <span>Total</span><span className="text-green-700">{formatCurrency(total)}</span>
              </div>
            </div>

            {selectedCustomer && customerHistory && customerHistory.loyaltyPoints > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">
                    Pontos disponíveis: {customerHistory.loyaltyPoints} pts
                    {" "}(= {formatCurrency(customerHistory.loyaltyPoints / 100)})
                  </span>
                  {loyaltyPointsToRedeem > 0 && (
                    <button
                      type="button"
                      onClick={() => updateActive((s) => ({ ...s, loyaltyPointsToRedeem: 0 }))}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={customerHistory.loyaltyPoints}
                    value={loyaltyPointsToRedeem || ""}
                    onChange={(e) => {
                      const v = Math.min(
                        Math.max(0, parseInt(e.target.value) || 0),
                        customerHistory.loyaltyPoints
                      )
                      updateActive((s) => ({ ...s, loyaltyPointsToRedeem: v }))
                    }}
                    placeholder="Pts a resgatar"
                    className="w-36 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateActive((s) => ({
                        ...s,
                        loyaltyPointsToRedeem: customerHistory.loyaltyPoints,
                      }))
                    }
                    className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                  >
                    Usar todos
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Select
                    value={p.method}
                    onValueChange={(v) =>
                      updateActive((s) => ({
                        ...s,
                        payments: s.payments.map((pp, ii) => (ii === i ? { ...pp, method: v as PaymentMethod } : pp)),
                      }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min="0" step="0.01"
                    value={p.amount || ""}
                    onChange={(e) =>
                      updateActive((s) => ({
                        ...s,
                        payments: s.payments.map((pp, ii) =>
                          ii === i ? { ...pp, amount: Number(e.target.value) || 0 } : pp
                        ),
                      }))
                    }
                    placeholder="Valor"
                    className="w-28"
                  />
                  {payments.length > 1 && (
                    <button
                      onClick={() =>
                        updateActive((s) => ({ ...s, payments: s.payments.filter((_, ii) => ii !== i) }))
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  updateActive((s) => ({
                    ...s,
                    payments: [...s.payments, { method: "DINHEIRO" as PaymentMethod, amount: 0 }],
                  }))
                }
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar forma de pagamento
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total pago</span>
                <span className={`font-semibold ${totalPaid >= total ? "text-green-700" : "text-red-600"}`}>{formatCurrency(totalPaid)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-sm font-bold text-blue-700">
                  <span>Troco</span><span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-600">Observação geral (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => updateActive((s) => ({ ...s, notes: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Obs. do pedido..."
              />
            </div>
          </div>
          {stoneEnabled && payments.some((p) => p.method === "DEBITO" || p.method === "CREDITO") && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
              <Wifi className="w-4 h-4 shrink-0" />
              <span>Débito/Crédito será enviado para a maquininha Stone automaticamente.</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancelar</Button>
            <Button
              onClick={finalizeOrder}
              disabled={finalizingOrder || totalPaid < total}
              variant="success"
            >
              {finalizingOrder
                ? "Finalizando..."
                : stoneEnabled && payments.some((p) => p.method === "DEBITO" || p.method === "CREDITO")
                  ? <><Wifi className="w-4 h-4" /> Enviar para Maquininha</>
                  : <><Check className="w-4 h-4" /> Finalizar Pedido</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
