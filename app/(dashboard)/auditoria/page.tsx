"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import { Shield, Loader2 } from "lucide-react"

type AuditRow = {
  id: string
  action: string
  resource: string
  resourceId: string | null
  createdAt: string
  user: { name: string; email: string } | null
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const res = await fetch(`/api/auditoria?${params}`)
    const data = await res.json()
    setLogs(data.data ?? [])
    setLoading(false)
  }, [from, to])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title="Auditoria" description="Registro de ações no sistema" />

      <div className="flex flex-wrap gap-2 mb-4">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        <Button variant="outline" onClick={load}>Filtrar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState icon={Shield} title="Nenhum registro" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3">Data</th>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">Ação</th>
                    <th className="p-3">Recurso</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{formatDateTime(log.createdAt)}</td>
                      <td className="p-3">{log.user?.name ?? "—"}</td>
                      <td className="p-3 font-mono text-xs">{log.action}</td>
                      <td className="p-3">
                        {log.resource}
                        {log.resourceId && (
                          <span className="text-muted-foreground ml-1">#{log.resourceId.slice(-6)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
