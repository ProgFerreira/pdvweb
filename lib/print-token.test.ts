import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createPrintToken, verifyPrintToken } from "./print-token"

const SALE_ID = "clwxyzabcdef0001"
const TENANT_ID = "tenant-galetos-01"
const OTHER_TENANT = "tenant-outro-99"
const OTHER_SALE = "clwxyzabcdef0002"

describe("createPrintToken / verifyPrintToken", () => {
  it("gera token válido para saleId + tenantId corretos", () => {
    const token = createPrintToken(SALE_ID, TENANT_ID)
    expect(verifyPrintToken(SALE_ID, TENANT_ID, token)).toBe(true)
  })

  it("rejeita token com saleId diferente", () => {
    const token = createPrintToken(SALE_ID, TENANT_ID)
    expect(verifyPrintToken(OTHER_SALE, TENANT_ID, token)).toBe(false)
  })

  it("rejeita token com tenantId diferente — bloqueio cross-tenant", () => {
    const token = createPrintToken(SALE_ID, TENANT_ID)
    expect(verifyPrintToken(SALE_ID, OTHER_TENANT, token)).toBe(false)
  })

  it("rejeita token adulterado", () => {
    const token = createPrintToken(SALE_ID, TENANT_ID)
    const tampered = token.slice(0, -4) + "XXXX"
    expect(verifyPrintToken(SALE_ID, TENANT_ID, tampered)).toBe(false)
  })

  it("rejeita token expirado", () => {
    const expired = createPrintToken(SALE_ID, TENANT_ID, -1000) // já expirado
    expect(verifyPrintToken(SALE_ID, TENANT_ID, expired)).toBe(false)
  })

  it("rejeita string vazia", () => {
    expect(verifyPrintToken(SALE_ID, TENANT_ID, "")).toBe(false)
  })

  it("rejeita token completamente inválido", () => {
    expect(verifyPrintToken(SALE_ID, TENANT_ID, "naoéumtoken")).toBe(false)
  })

  it("token gerado é base64url (sem +, /, =)", () => {
    const token = createPrintToken(SALE_ID, TENANT_ID)
    expect(token).not.toMatch(/[+/=]/)
  })

  it("dois tokens para o mesmo saleId+tenantId são diferentes (expiração diferente)", async () => {
    const t1 = createPrintToken(SALE_ID, TENANT_ID)
    await new Promise((r) => setTimeout(r, 2))
    const t2 = createPrintToken(SALE_ID, TENANT_ID)
    expect(t1).not.toBe(t2)
    // Ambos devem ser válidos
    expect(verifyPrintToken(SALE_ID, TENANT_ID, t1)).toBe(true)
    expect(verifyPrintToken(SALE_ID, TENANT_ID, t2)).toBe(true)
  })
})
