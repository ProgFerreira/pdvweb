import type { NextRequest } from "next/server"

export function getRequestMeta(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null
  const userAgent = req.headers.get("user-agent") ?? null
  return { ip, userAgent }
}
