import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function getTenantId(session: Session): Promise<string> {
  const fromSession = (session.user as { tenantId?: string }).tenantId
  if (fromSession) return fromSession

  if (!session.user?.id) {
    throw new Error("Sessão sem tenant")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })

  if (!user?.tenantId) {
    throw new Error("Sessão sem tenant")
  }

  return user.tenantId
}

export function withTenant<T extends Record<string, unknown>>(
  tenantId: string,
  where?: T
): T & { tenantId: string } {
  return { ...where, tenantId } as T & { tenantId: string }
}
