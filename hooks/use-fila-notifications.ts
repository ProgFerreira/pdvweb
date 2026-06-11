"use client"

import { useEffect, useRef } from "react"

export function useFilaNotifications(enabled: boolean, pollMs = 15000) {
  const lastCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const check = async () => {
      try {
        const res = await fetch(
          "/api/vendas?status=AGUARDANDO&pageSize=1"
        )
        const data = await res.json()
        const total = data.total ?? (Array.isArray(data.data) ? data.data.length : 0)

        if (lastCountRef.current !== null && total > lastCountRef.current) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("PDV Galetos", {
              body: "Novo pedido na fila",
            })
          }
        }
        lastCountRef.current = total
      } catch {
        /* ignore poll errors */
      }
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    check()
    const id = setInterval(check, pollMs)
    return () => clearInterval(id)
  }, [enabled, pollMs])
}
