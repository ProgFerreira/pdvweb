"use client"

import { hasPermission, NAV_PERMISSIONS, type Permission } from "@/lib/permissions"

export function canAccessRoute(role: string | undefined, href: string): boolean {
  if (!role) return false
  const permission = NAV_PERMISSIONS[href]
  if (!permission) return true
  return hasPermission(role, permission)
}

export function canDo(role: string | undefined, permission: Permission): boolean {
  if (!role) return false
  return hasPermission(role, permission)
}
