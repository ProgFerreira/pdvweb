"use client"

import { signOut, useSession } from "next-auth/react"
import { Bell, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TopbarProps {
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  const { data: session } = useSession()

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    GERENTE: "Gerente",
    CAIXA: "Caixa",
    ATENDENTE: "Atendente",
    COZINHA: "Cozinha",
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        {title && <h1 className="text-lg font-semibold text-gray-800">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors relative">
          <Bell className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{session?.user?.name}</p>
            <p className="text-xs text-gray-500">{roleLabels[session?.user?.role ?? ""] ?? session?.user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-1"
            title="Sair"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>
    </header>
  )
}
