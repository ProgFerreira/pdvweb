import { describe, it, expect } from "vitest"
import { vendaSchema, vendaItemSchema, vendaPaymentSchema } from "./venda"

const validItem = { productId: "prod-001", quantity: 2, unitPrice: 10 }
const validPayment = { method: "DINHEIRO" as const, amount: 20 }

const validBase = {
  cashRegisterId: "caixa-001",
  items: [validItem],
  payments: [validPayment],
}

// ─── vendaItemSchema ───────────────────────────────────────────────────────────

describe("vendaItemSchema", () => {
  it("aceita item válido", () => {
    expect(vendaItemSchema.safeParse(validItem).success).toBe(true)
  })
  it("rejeita quantity < 1", () => {
    expect(vendaItemSchema.safeParse({ ...validItem, quantity: 0 }).success).toBe(false)
  })
  it("rejeita unitPrice negativo", () => {
    expect(vendaItemSchema.safeParse({ ...validItem, unitPrice: -1 }).success).toBe(false)
  })
  it("desconto padrão é 0", () => {
    const r = vendaItemSchema.safeParse(validItem)
    expect(r.success && r.data.discount).toBe(0)
  })
})

// ─── vendaPaymentSchema ────────────────────────────────────────────────────────

describe("vendaPaymentSchema", () => {
  it("aceita todos os métodos de pagamento", () => {
    for (const method of ["DINHEIRO", "PIX", "DEBITO", "CREDITO", "VALE"] as const) {
      expect(vendaPaymentSchema.safeParse({ method, amount: 10 }).success).toBe(true)
    }
  })
  it("rejeita amount zero", () => {
    expect(vendaPaymentSchema.safeParse({ method: "PIX", amount: 0 }).success).toBe(false)
  })
  it("rejeita método inválido", () => {
    expect(vendaPaymentSchema.safeParse({ method: "BOLETO", amount: 10 }).success).toBe(false)
  })
})

// ─── vendaSchema ──────────────────────────────────────────────────────────────

describe("vendaSchema", () => {
  it("aceita payload mínimo válido", () => {
    expect(vendaSchema.safeParse(validBase).success).toBe(true)
  })

  it("rejeita venda sem caixa", () => {
    const r = vendaSchema.safeParse({ ...validBase, cashRegisterId: "" })
    expect(r.success).toBe(false)
  })

  it("rejeita venda sem itens", () => {
    const r = vendaSchema.safeParse({ ...validBase, items: [] })
    expect(r.success).toBe(false)
  })

  it("rejeita venda sem pagamentos", () => {
    const r = vendaSchema.safeParse({ ...validBase, payments: [] })
    expect(r.success).toBe(false)
  })

  it("loyaltyPointsToRedeem padrão é 0", () => {
    const r = vendaSchema.safeParse(validBase)
    expect(r.success && r.data.loyaltyPointsToRedeem).toBe(0)
  })

  it("loyaltyPointsToRedeem aceita valor positivo", () => {
    const r = vendaSchema.safeParse({ ...validBase, loyaltyPointsToRedeem: 150 })
    expect(r.success && r.data.loyaltyPointsToRedeem).toBe(150)
  })

  it("loyaltyPointsToRedeem rejeita valor negativo", () => {
    expect(vendaSchema.safeParse({ ...validBase, loyaltyPointsToRedeem: -1 }).success).toBe(false)
  })

  it("loyaltyPointsToRedeem rejeita valor não inteiro", () => {
    expect(vendaSchema.safeParse({ ...validBase, loyaltyPointsToRedeem: 1.5 }).success).toBe(false)
  })

  it("desconto e acréscimo são 0 por padrão", () => {
    const r = vendaSchema.safeParse(validBase)
    expect(r.success && r.data.discount).toBe(0)
    expect(r.success && r.data.addition).toBe(0)
  })

  it("orderType padrão é BALCAO", () => {
    const r = vendaSchema.safeParse(validBase)
    expect(r.success && r.data.orderType).toBe("BALCAO")
  })

  it("rejeita orderType inválido", () => {
    expect(vendaSchema.safeParse({ ...validBase, orderType: "DRIVE_THRU" }).success).toBe(false)
  })
})
