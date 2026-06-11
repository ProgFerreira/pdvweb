import { describe, it, expect, beforeEach } from "vitest"

// We test the rate limiter logic in isolation by calling the exported function
// with a mocked NextRequest-like object.
import { rateLimit } from "./rate-limit"
import type { NextRequest } from "next/server"

function makeReq(ip = "1.2.3.4"): NextRequest {
  return {
    headers: {
      get: (key: string) => (key === "x-forwarded-for" ? ip : null),
    },
  } as unknown as NextRequest
}

describe("rateLimit", () => {
  // Each test uses a unique prefix so the shared store doesn't bleed between tests
  let prefix: string

  beforeEach(() => {
    prefix = `test-${Math.random().toString(36).slice(2)}`
  })

  it("permite a primeira requisição", () => {
    const result = rateLimit(makeReq(), { limit: 5, windowSeconds: 60, prefix })
    expect(result).toBeNull()
  })

  it("permite até o limite", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(makeReq(), { limit: 5, windowSeconds: 60, prefix })).toBeNull()
    }
  })

  it("bloqueia após exceder o limite", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit(makeReq(), { limit: 5, windowSeconds: 60, prefix })
    }
    const result = rateLimit(makeReq(), { limit: 5, windowSeconds: 60, prefix })
    expect(result).not.toBeNull()
    expect(result?.status).toBe(429)
  })

  it("IPs diferentes não interferem", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit(makeReq("1.1.1.1"), { limit: 5, windowSeconds: 60, prefix })
    }
    // IP diferente ainda deve passar
    expect(rateLimit(makeReq("2.2.2.2"), { limit: 5, windowSeconds: 60, prefix })).toBeNull()
  })

  it("prefixos diferentes não interferem", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit(makeReq(), { limit: 5, windowSeconds: 60, prefix: `${prefix}-a` })
    }
    // Mesmo IP, prefixo diferente — deve passar
    expect(rateLimit(makeReq(), { limit: 5, windowSeconds: 60, prefix: `${prefix}-b` })).toBeNull()
  })
})
