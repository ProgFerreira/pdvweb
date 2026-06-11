import { describe, it, expect } from "vitest"
import {
  contaPagarSchema,
  contaPagarUpdateSchema,
  pagarContaSchema,
  PAYABLE_CATEGORIES,
} from "./conta-pagar"

const validBase = {
  description: "Conta de luz",
  category: "OUTROS" as const,
  amount: 350,
  dueDate: "2026-07-10",
}

// ─── contaPagarSchema ─────────────────────────────────────────────────────────

describe("contaPagarSchema", () => {
  it("aceita payload mínimo válido", () => {
    expect(contaPagarSchema.safeParse(validBase).success).toBe(true)
  })

  it("rejeita descrição muito curta", () => {
    expect(contaPagarSchema.safeParse({ ...validBase, description: "A" }).success).toBe(false)
  })

  it("rejeita valor zero", () => {
    expect(contaPagarSchema.safeParse({ ...validBase, amount: 0 }).success).toBe(false)
  })

  it("rejeita valor negativo", () => {
    expect(contaPagarSchema.safeParse({ ...validBase, amount: -100 }).success).toBe(false)
  })

  it("rejeita vencimento vazio", () => {
    expect(contaPagarSchema.safeParse({ ...validBase, dueDate: "" }).success).toBe(false)
  })

  it("category é obrigatória — sem default automático", () => {
    // Antes category tinha .default("OUTROS"), agora é obrigatória
    const { category, ...withoutCategory } = validBase
    expect(contaPagarSchema.safeParse(withoutCategory).success).toBe(false)
  })

  it("aceita todas as categorias válidas", () => {
    for (const cat of PAYABLE_CATEGORIES) {
      expect(contaPagarSchema.safeParse({ ...validBase, category: cat }).success).toBe(true)
    }
  })

  it("rejeita categoria inválida", () => {
    expect(contaPagarSchema.safeParse({ ...validBase, category: "DESPESA" }).success).toBe(false)
  })

  it("aceita supplierId e purchaseOrderId opcionais", () => {
    const r = contaPagarSchema.safeParse({
      ...validBase,
      supplierId: "sup-001",
      purchaseOrderId: "po-001",
    })
    expect(r.success).toBe(true)
  })

  it("aceita supplierId como string vazia (sem fornecedor)", () => {
    expect(contaPagarSchema.safeParse({ ...validBase, supplierId: "" }).success).toBe(true)
  })
})

// ─── contaPagarUpdateSchema ───────────────────────────────────────────────────

describe("contaPagarUpdateSchema", () => {
  it("aceita payload parcial vazio", () => {
    expect(contaPagarUpdateSchema.safeParse({}).success).toBe(true)
  })

  it("aceita apenas um campo", () => {
    expect(contaPagarUpdateSchema.safeParse({ amount: 200 }).success).toBe(true)
  })

  it("valida campos se fornecidos", () => {
    expect(contaPagarUpdateSchema.safeParse({ amount: -1 }).success).toBe(false)
  })
})

// ─── pagarContaSchema ─────────────────────────────────────────────────────────

describe("pagarContaSchema", () => {
  it("aceita pagamento válido", () => {
    expect(pagarContaSchema.safeParse({ amount: 350, paymentMethod: "PIX" }).success).toBe(true)
  })

  it("rejeita amount zero", () => {
    expect(pagarContaSchema.safeParse({ amount: 0, paymentMethod: "PIX" }).success).toBe(false)
  })

  it("rejeita método inválido", () => {
    expect(pagarContaSchema.safeParse({ amount: 100, paymentMethod: "BOLETO" }).success).toBe(false)
  })
})
