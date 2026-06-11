import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

type AuditParams = {
  tenantId: string
  userId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  oldData?: Prisma.InputJsonValue
  newData?: Prisma.InputJsonValue
  ip?: string | null
  userAgent?: string | null
}

export async function auditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        oldData: params.oldData ?? undefined,
        newData: params.newData ?? undefined,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    })
  } catch (error) {
    console.error("[audit]", error)
  }
}
