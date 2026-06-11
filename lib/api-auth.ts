import { auth } from "@/lib/auth"
import { apiError } from "@/lib/utils"
import { hasPermissionDb } from "@/lib/permissions-db"
import type { Permission } from "@/lib/permissions"
import type { Session } from "next-auth"

export async function requireSession(): Promise<Session | Response> {
  const session = await auth()
  if (!session?.user) {
    return apiError("Não autorizado", 401)
  }
  return session
}

export async function requirePermission(
  permission: Permission
): Promise<Session | Response> {
  const result = await requireSession()
  if (result instanceof Response) return result

  const allowed = await hasPermissionDb(result.user.role, permission)
  if (!allowed) {
    return apiError("Sem permissão para esta ação", 403)
  }
  return result
}

export function isSession(result: Session | Response): result is Session {
  return !(result instanceof Response)
}
