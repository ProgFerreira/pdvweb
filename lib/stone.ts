/**
 * Stone Payments API — wrapper para integração com maquininha física.
 * Credenciais são carregadas do banco (Settings) por tenant.
 * STONE_WEBHOOK_SECRET permanece em variável de ambiente.
 *
 * Docs: https://docs.stone.com.br
 * Ambiente sandbox: STONE_SANDBOX=true em .env.local
 */

import crypto from "crypto"

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type StonePaymentType = "debit" | "credit"

export interface StoneTransactionParams {
  amount: number            // valor total em centavos
  paymentType: StonePaymentType
  installments?: number     // parcelas (somente crédito)
  terminalSerial: string    // número de série da maquininha
  orderId: string           // referência interna (orderNumber)
  description?: string
  clientId: string
  clientSecret: string
  accountId: string
}

export interface StoneTransaction {
  id: string
  status: "pending" | "approved" | "cancelled" | "failed" | "timeout"
  amount: number
  authCode?: string
  nsu?: string
  installments?: number
  capturedAt?: string
  errorMessage?: string
}

// ─── Cache de tokens OAuth2 ────────────────────────────────────────────────────

type TokenCache = { token: string; expiresAt: number }
const tokenCache = new Map<string, TokenCache>()

function getBaseUrl(): string {
  return process.env.STONE_SANDBOX === "false"
    ? "https://openbank.stone.com.br"
    : "https://sandbox.openbank.stone.com.br"
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now()
  const cached = tokenCache.get(clientId)
  if (cached && cached.expiresAt > now + 30_000) return cached.token

  const baseUrl = getBaseUrl()
  const res = await fetch(
    `${baseUrl}/auth/realms/stone_bank/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Stone auth falhou (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache.set(clientId, { token: data.access_token, expiresAt: now + data.expires_in * 1000 })
  return data.access_token
}

// ─── Operações ────────────────────────────────────────────────────────────────

export async function stoneCreateTransaction(
  params: StoneTransactionParams
): Promise<StoneTransaction> {
  const token = await getAccessToken(params.clientId, params.clientSecret)
  const baseUrl = getBaseUrl()

  const body: Record<string, unknown> = {
    amount: params.amount,
    payment_type: params.paymentType,
    installment_count: params.installments ?? 1,
    capture: true,
    terminal_serial_number: params.terminalSerial,
    order_id: params.orderId,
    statement_descriptor: params.description ?? "PDV",
  }

  if (params.paymentType === "credit" && (params.installments ?? 1) > 1) {
    body.installment_plan = "issuer_plan"
  }

  const res = await fetch(`${baseUrl}/api/v1/acquirer/accounts/${params.accountId}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Stone criar transação falhou (${res.status}): ${err}`)
  }

  return mapTransaction(await res.json())
}

export async function stoneGetTransaction(
  transactionId: string,
  clientId: string,
  clientSecret: string,
  accountId: string
): Promise<StoneTransaction> {
  const token = await getAccessToken(clientId, clientSecret)
  const baseUrl = getBaseUrl()

  const res = await fetch(
    `${baseUrl}/api/v1/acquirer/accounts/${accountId}/transactions/${transactionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Stone consultar transação falhou (${res.status}): ${err}`)
  }

  return mapTransaction(await res.json())
}

export async function stoneCancelTransaction(
  transactionId: string,
  clientId: string,
  clientSecret: string,
  accountId: string
): Promise<void> {
  const token = await getAccessToken(clientId, clientSecret)
  const baseUrl = getBaseUrl()

  const res = await fetch(
    `${baseUrl}/api/v1/acquirer/accounts/${accountId}/transactions/${transactionId}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Stone cancelar transação falhou (${res.status}): ${err}`)
  }
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export function verifyStoneWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.STONE_WEBHOOK_SECRET
  if (!secret) return false

  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
    const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ""), "hex")
    const expBuffer = Buffer.from(expected, "hex")
    if (sigBuffer.length !== expBuffer.length) return false
    return crypto.timingSafeEqual(sigBuffer, expBuffer)
  } catch {
    return false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransaction(data: any): StoneTransaction {
  return {
    id: String(data.id),
    status: normalizeStatus(data.status),
    amount: Number(data.amount),
    authCode: data.authorization_code ?? data.authCode ?? undefined,
    nsu: data.nsu ?? undefined,
    installments: data.installment_count ?? undefined,
    capturedAt: data.captured_at ?? undefined,
    errorMessage: data.error_message ?? data.errorMessage ?? undefined,
  }
}

function normalizeStatus(raw: string): StoneTransaction["status"] {
  const map: Record<string, StoneTransaction["status"]> = {
    pending: "pending",
    waiting_payment: "pending",
    processing: "pending",
    approved: "approved",
    authorized: "approved",
    captured: "approved",
    paid: "approved",
    cancelled: "cancelled",
    voided: "cancelled",
    reversed: "cancelled",
    failed: "failed",
    declined: "failed",
    refused: "failed",
    timeout: "timeout",
    expired: "timeout",
  }
  return map[raw?.toLowerCase()] ?? "pending"
}
