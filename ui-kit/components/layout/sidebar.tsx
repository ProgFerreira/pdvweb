"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react"
import { useState, useEffect, type ComponentType } from "react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon | ComponentType<{ className?: string }>
}

export interface SidebarProps {
  navItems: NavItem[]
  brandName?: string
  brandSubtitle?: string
  brandIcon?: LucideIcon | ComponentType<{ className?: string }>
  /** Filtra itens (ex.: permissões). Retorne false para ocultar. */
  filterNavItem?: (item: NavItem) => boolean
}

export function Sidebar({
  navItems,
  brandName = "Meu Sistema",
  brandSubtitle = "v1.0.0",
  brandIcon: BrandIcon = Flame,
  filterNavItem,
}: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = filterNavItem
    ? navItems.filter(filterNavItem)
    : navItems

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

      {mobileOpen && <MobileOverlay onClose={() => setMobileOpen(false)} />}

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
            <BrandIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-tight">{brandName}</p>
              <p className="text-slate-400 text-xs">{brandSubtitle}</p>
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
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
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
