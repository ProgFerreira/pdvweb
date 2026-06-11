"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { APP_VERSION } from "@/lib/version"
import { canAccessRoute } from "@/lib/client-permissions"
import {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  CreditCard,
  History,
  Warehouse,
  ShoppingBag,
  Wallet,
  LayoutGrid,
  Tag,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Flame,
  Tags,
  Shield,
  Menu,
  X,
  FileText,
} from "lucide-react"
import { useState, useEffect } from "react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pdv", label: "PDV", icon: ShoppingCart },
  { href: "/fila", label: "Fila de Pedidos", icon: Clock },
  { href: "/caixa", label: "Caixa", icon: CreditCard },
  { href: "/vendas", label: "Vendas", icon: History },
  { href: "/estoque", label: "Estoque", icon: Warehouse },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/notas-fiscais-compra", label: "NFs de Compra", icon: FileText },
  { href: "/contas-pagar", label: "Contas a Pagar", icon: Wallet },
  { href: "/mesas", label: "Mesas", icon: LayoutGrid },
  { href: "/promocoes", label: "Promoções", icon: Tag },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/usuarios", label: "Usuários", icon: UserCog },
  { href: "/auditoria", label: "Auditoria", icon: Shield },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = navItems.filter((item) => canAccessRoute(role, item.href))

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <MobileOverlay onClose={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white transition-all duration-300 min-h-screen",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-3 right-3 p-1 text-slate-400 hover:text-white"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className={cn(
            "flex items-center gap-3 p-4 border-b border-slate-700",
            collapsed && "justify-center p-3"
          )}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-tight">PDV Galetos</p>
              <p className="text-slate-400 text-xs">v{APP_VERSION}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full items-center justify-center hover:bg-slate-600 transition-colors z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-white" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-white" />
          )}
        </button>
      </aside>
    </>
  )
}

function MobileOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="lg:hidden fixed inset-0 bg-black/50 z-40"
      onClick={onClose}
      aria-hidden
    />
  )
}
