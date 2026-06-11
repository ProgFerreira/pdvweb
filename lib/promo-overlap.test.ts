import { describe, it, expect } from "vitest"
import { detectPromoOverlap, type PromoConflictCandidate, type PromoScopeData } from "./promo-overlap"

const PRODUCT_ID = "prod-frango-123"
const CATEGORY_ID = "cat-grelhados-01"

function makeCandidate(
  name: string,
  startAt: Date | null = null,
  endAt: Date | null = null
): PromoConflictCandidate {
  return { name, startAt, endAt }
}

// ─── Sem conflito ──────────────────────────────────────────────────────────────

describe("detectPromoOverlap — sem conflito", () => {
  it("retorna null quando não há candidatas", () => {
    const incoming: PromoScopeData = { isActive: true, productId: PRODUCT_ID }
    expect(detectPromoOverlap(incoming, [])).toBeNull()
  })

  it("retorna null quando promoção está inativa", () => {
    const candidate = makeCandidate("Promo A")
    const incoming: PromoScopeData = { isActive: false, productId: PRODUCT_ID }
    expect(detectPromoOverlap(incoming, [candidate])).toBeNull()
  })

  it("retorna null quando não há escopo definido (sem produto nem categoria)", () => {
    const candidate = makeCandidate("Promo A")
    const incoming: PromoScopeData = { isActive: true }
    expect(detectPromoOverlap(incoming, [candidate])).toBeNull()
  })

  it("retorna null quando períodos NÃO se sobrepõem", () => {
    const existing = makeCandidate(
      "Promo Janeiro",
      new Date("2026-01-01"),
      new Date("2026-01-31")
    )
    const incoming: PromoScopeData = {
      isActive: true,
      productId: PRODUCT_ID,
      startAt: "2026-02-01",
      endAt: "2026-02-28",
    }
    expect(detectPromoOverlap(incoming, [existing])).toBeNull()
  })

  it("retorna null quando promoções tocam exatamente na borda (sem sobreposição real)", () => {
    // borda: fim de uma = início de outra não conflita porque aStart <= bEnd é false quando aStart === bEnd + 1
    const existing = makeCandidate("Promo A", new Date("2026-01-01"), new Date("2026-01-31"))
    const incoming: PromoScopeData = {
      isActive: true,
      productId: PRODUCT_ID,
      startAt: "2026-02-01", // começa no dia seguinte ao fim
      endAt: "2026-02-28",
    }
    expect(detectPromoOverlap(incoming, [existing])).toBeNull()
  })
})

// ─── Com conflito ─────────────────────────────────────────────────────────────

describe("detectPromoOverlap — com conflito", () => {
  it("detecta conflito quando ambas são permanentes (sem datas)", () => {
    const existing = makeCandidate("Promo Permanente")
    const incoming: PromoScopeData = { isActive: true, productId: PRODUCT_ID }
    const result = detectPromoOverlap(incoming, [existing])
    expect(result).not.toBeNull()
    expect(result).toContain("Promo Permanente")
  })

  it("detecta conflito quando nova é permanente e existe ativa com data", () => {
    const existing = makeCandidate("Promo Com Data", new Date("2026-01-01"), new Date("2026-12-31"))
    const incoming: PromoScopeData = {
      isActive: true,
      productId: PRODUCT_ID,
      // sem datas = permanente
    }
    const result = detectPromoOverlap(incoming, [existing])
    expect(result).not.toBeNull()
    expect(result).toContain("Promo Com Data")
  })

  it("detecta sobreposição parcial de datas", () => {
    const existing = makeCandidate("Promo Verão", new Date("2026-01-15"), new Date("2026-02-15"))
    const incoming: PromoScopeData = {
      isActive: true,
      productId: PRODUCT_ID,
      startAt: "2026-02-01",
      endAt: "2026-03-01",
    }
    const result = detectPromoOverlap(incoming, [existing])
    expect(result).not.toBeNull()
    expect(result).toContain("Promo Verão")
  })

  it("detecta sobreposição quando nova contém completamente a existente", () => {
    const existing = makeCandidate("Promo Pequena", new Date("2026-02-01"), new Date("2026-02-10"))
    const incoming: PromoScopeData = {
      isActive: true,
      productId: PRODUCT_ID,
      startAt: "2026-01-01",
      endAt: "2026-03-31",
    }
    const result = detectPromoOverlap(incoming, [existing])
    expect(result).not.toBeNull()
    expect(result).toContain("Promo Pequena")
  })

  it("retorna mensagem com nome da promoção conflitante", () => {
    const existing = makeCandidate("Promoção de Outono")
    const incoming: PromoScopeData = { isActive: true, categoryId: CATEGORY_ID }
    const result = detectPromoOverlap(incoming, [existing])
    expect(result).toContain("Promoção de Outono")
  })

  it("conflito com categoria, não apenas produto", () => {
    const existing = makeCandidate("Promo Categoria")
    const incoming: PromoScopeData = { isActive: true, categoryId: CATEGORY_ID }
    expect(detectPromoOverlap(incoming, [existing])).not.toBeNull()
  })
})
