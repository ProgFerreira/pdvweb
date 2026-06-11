"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { usuarioSchema, type UsuarioInput } from "@/schemas/usuario"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { canDo } from "@/lib/client-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, UserCog, Loader2 } from "lucide-react"
import type { User, UserRole } from "@/types"

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador", GERENTE: "Gerente", CAIXA: "Caixa", ATENDENTE: "Atendente", COZINHA: "Cozinha",
}
const ROLE_BADGE: Record<UserRole, "destructive" | "warning" | "info" | "secondary" | "success"> = {
  ADMIN: "destructive", GERENTE: "warning", CAIXA: "info", ATENDENTE: "secondary", COZINHA: "success",
}

type UserPublic = Pick<User, "id" | "name" | "email" | "role" | "isActive" | "createdAt">

export default function UsuariosPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const role = session?.user?.role
  const canDelete = canDo(role, "usuarios.excluir")

  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserPublic | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserPublic | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<UsuarioInput>({
    resolver: zodResolver(usuarioSchema),
  })

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/usuarios")
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const openCreate = () => {
    setEditing(null)
    reset({ name: "", email: "", password: "", role: undefined, isActive: true })
    setOpen(true)
  }

  const openEdit = (u: UserPublic) => {
    setEditing(u)
    reset({ name: u.name, email: u.email, role: u.role, isActive: u.isActive, password: "" })
    setOpen(true)
  }

  const onSubmit = async (data: UsuarioInput) => {
    const url = editing ? `/api/usuarios/${editing.id}` : "/api/usuarios"
    const method = editing ? "PATCH" : "POST"
    const body = editing ? { ...data, password: data.password || undefined } : data
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) {
      toast({ title: editing ? "Usuário atualizado!" : "Usuário criado!" })
      setOpen(false)
      loadUsers()
    } else {
      const err = await res.json()
      toast({ title: "Erro", description: err.error ?? "Tente novamente", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/usuarios/${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    setDeleteTarget(null)
    if (res.ok) {
      toast({ title: "Usuário removido" })
      loadUsers()
    } else {
      const err = await res.json()
      toast({ title: "Erro ao remover", description: err.error ?? "Tente novamente", variant: "destructive" })
    }
  }

  const isActive = watch("isActive")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm">{users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo Usuário</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <UserCog className="w-10 h-10" />
              <p className="text-sm">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Perfil</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Criado em</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={ROLE_BADGE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {canDelete && u.id !== session?.user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteTarget(u)}
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input {...register("name")} placeholder="Nome completo" />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input {...register("email")} type="email" placeholder="email@empresa.com" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>{editing ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label>
              <Input {...register("password")} type="password" placeholder="••••••••" autoComplete="new-password" />
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Perfil *</Label>
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserRole)}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-red-500 text-xs">{errors.role.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={!!isActive}
                onClick={() => setValue("isActive", !isActive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <Label className="cursor-pointer" onClick={() => setValue("isActive", !isActive)}>
                Usuário ativo
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvando...</> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>? O acesso será revogado imediatamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
