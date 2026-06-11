"use client"

import { Bell, LogOut, User } from "lucide-react"
import { Button } from "../ui/button"

export interface TopbarProps {
  title?: string
  userName?: string
  userSubtitle?: string
  onSignOut?: () => void
  showNotifications?: boolean
}

export function Topbar({
  title,
  userName = "Usuário",
  userSubtitle,
  onSignOut,
  showNotifications = true,
}: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        {title && <h1 className="text-lg font-semibold text-gray-800">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {showNotifications && (
          <button
            type="button"
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors relative"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4 text-gray-500" />
          </button>
        )}

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{userName}</p>
            {userSubtitle && (
              <p className="text-xs text-gray-500">{userSubtitle}</p>
            )}
          </div>
          {onSignOut && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="ml-1"
              title="Sair"
              type="button"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
