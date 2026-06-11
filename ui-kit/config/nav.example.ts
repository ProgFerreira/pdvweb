import type { NavItem } from "../components/layout/sidebar"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
} from "lucide-react"

/** Exemplo de menu — copie para `config/nav.ts` e ajuste os itens. */
export const defaultNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pdv", label: "PDV", icon: ShoppingCart },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]
