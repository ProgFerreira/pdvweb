import type {
  User,
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  Payment,
  CashRegister,
  CashMovement,
  UserRole,
  SaleStatus,
  PaymentMethod,
  CashStatus,
  MovementType,
} from "@prisma/client"

export type {
  User,
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  Payment,
  CashRegister,
  CashMovement,
  UserRole,
  SaleStatus,
  PaymentMethod,
  CashStatus,
  MovementType,
}

// ─── Tipos estendidos ──────────────────────────────────────────────────────────

export type SaleWithRelations = Sale & {
  customer: Customer | null
  user: Pick<User, "id" | "name">
  items: (SaleItem & { product: Pick<Product, "id" | "name" | "code" | "kitchenSector"> })[]
  payments: Payment[]
}

export type ProductWithCategory = Product & {
  category: Category
}

export type CashRegisterWithUser = CashRegister & {
  user: Pick<User, "id" | "name">
  movements: CashMovement[]
}

// ─── Tipos do carrinho (PDV) ───────────────────────────────────────────────────

export interface CartItem {
  productId: string
  name: string
  code: string
  unitPrice: number
  quantity: number
  discount: number
  total: number
  notes?: string
}

export interface CartPayment {
  method: PaymentMethod
  amount: number
}

/** Dados opcionais de entrega no PDV */
export interface PdvDeliveryInfo {
  address: string
  neighborhood: string
  city: string
  complement: string
  reference: string
}

/** Sessão de atendimento no PDV (fila de caixas) */
export interface PdvSession {
  id: string
  label: string
  cart: CartItem[]
  selectedCustomer: Customer | null
  customerSearch: string
  guestName: string
  guestPhone: string
  delivery: PdvDeliveryInfo
  discount: number
  addition: number
  waiveServiceFee: boolean
  loyaltyPointsToRedeem: number
  orderType: OrderType
  notes: string
  payments: CartPayment[]
  lastOrder: { id: string; orderNumber: number } | null
}

// ─── Tipos de resposta API ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalSoldToday: number
  totalOrdersToday: number
  averageTicket: number
  openOrders: number
  preparingOrders: number
  readyOrders: number
  cancelledOrders: number
  cancellationRate?: number
  yesterdayTotal?: number
  salesGrowthPercent?: number
  salesByPaymentMethod: { method: string; total: number }[]
  topProducts: { name: string; quantity: number; total: number }[]
  salesLast7Days: { date: string; total: number; orders: number }[]
  salesByHourOfDay?: { hour: string; total: number }[]
  operatorRanking?: { name: string; orders: number; total: number; averageTicket: number }[]
  lowStockProducts?: {
    id: string
    name: string
    code: string
    stock: number
    minStock: number
  }[]
}

export type OrderType = "BALCAO" | "RETIRADA" | "DELIVERY_PROPRIO"

export interface CustomerHistory {
  sales: Array<{
    id: string
    orderNumber: number
    total: unknown
    createdAt: string
    items: Array<{ productId: string; quantity: number; product: { name: string } }>
  }>
  totalSpent: number
  orderCount: number
  averageTicket: number
  loyaltyPoints: number
}

// ─── Sessão estendida ──────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      tenantId: string
    }
  }
}
