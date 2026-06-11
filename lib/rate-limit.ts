import { NextRequest } from "next/server"
import { apiError } from "@/lib/utils"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
  /** Key prefix to namespace different limiters */
  prefix?: string
}

/**
 * Returns an error Response if the request exceeds the rate limit, otherwise null.
 * Key is derived from the client IP.
 */
export function rateLimit(req: NextRequest, options: RateLimitOptions): Response | null {
  const { limit, windowSeconds, prefix = "rl" } = options

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  const key = `${prefix}:${ip}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count += 1

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return apiError(`Muitas tentativas. Tente novamente em ${retryAfter}s.`, 429)
  }

  return null
}
