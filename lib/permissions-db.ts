import { prisma } from "@/lib/prisma"
import { hasPermission as hasStaticPermission, type Permission } from "@/lib/permissions"
import type { UserRole } from "@prisma/client"

let cache: Map<string, Set<string>> | null = null
let cacheAt = 0
const CACHE_TTL = 60_000

async function loadRolePermissions(): Promise<Map<string, Set<string>>> {
  const now = Date.now()
  if (cache && now - cacheAt < CACHE_TTL) return cache

  const rows = await prisma.rolePermission.findMany({
    include: { permission: { select: { code: true } } },
  })

  const map = new Map<string, Set<string>>()
  for (const row of rows) {
    const key = row.role
    if (!map.has(key)) map.set(key, new Set())
    map.get(key)!.add(row.permission.code)
  }

  cache = map
  cacheAt = now
  return map
}

export async function hasPermissionDb(
  role: string,
  permission: Permission
): Promise<boolean> {
  try {
    const map = await loadRolePermissions()
    const perms = map.get(role as UserRole)
    if (perms && perms.size > 0) {
      return perms.has(permission)
    }
  } catch {
    // fallback if DB not seeded
  }
  return hasStaticPermission(role, permission)
}

export function clearPermissionCache() {
  cache = null
}
