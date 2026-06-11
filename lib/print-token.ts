import { createHmac, timingSafeEqual } from "crypto"

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-print-secret"

/**
 * Cria um token de impressão assinado com HMAC-SHA256.
 * O token embute saleId + tenantId + expiração, impedindo acesso
 * cross-tenant mesmo que o CUID da venda seja descoberto.
 */
export function createPrintToken(
  saleId: string,
  tenantId: string,
  expiresInMs = 15 * 60 * 1000
): string {
  const exp = Date.now() + expiresInMs
  const payload = `${saleId}.${tenantId}.${exp}`
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex")
  return Buffer.from(`${payload}.${sig}`).toString("base64url")
}

/**
 * Valida o token e verifica que corresponde ao saleId e tenantId esperados.
 * Retorna false em qualquer falha (expirado, adulterado, tenant errado).
 */
export function verifyPrintToken(
  saleId: string,
  tenantId: string,
  token: string
): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    // formato: saleId.tenantId.exp.sig
    const lastDot = decoded.lastIndexOf(".")
    if (lastDot === -1) return false
    const sig = decoded.slice(lastDot + 1)
    const payload = decoded.slice(0, lastDot)

    const parts = payload.split(".")
    if (parts.length < 3) return false
    const exp = Number(parts[parts.length - 1])
    const embeddedTenantId = parts[parts.length - 2]
    const embeddedSaleId = parts.slice(0, parts.length - 2).join(".")

    if (embeddedSaleId !== saleId) return false
    if (embeddedTenantId !== tenantId) return false
    if (Number.isNaN(exp) || Date.now() > exp) return false

    const expected = createHmac("sha256", SECRET).update(payload).digest("hex")
    const a = Buffer.from(sig, "hex")
    const b = Buffer.from(expected, "hex")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
