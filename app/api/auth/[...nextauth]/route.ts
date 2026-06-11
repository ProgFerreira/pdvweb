import { NextRequest } from "next/server"
import { handlers } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"

export const GET = handlers.GET

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowSeconds: 60, prefix: "auth" })
  if (limited) return limited
  return handlers.POST(req)
}
