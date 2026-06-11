/**
 * Lógica pura de validação de sobreposição de promoções.
 * Separada em módulo próprio para facilitar os testes unitários.
 */

export interface PromoConflictCandidate {
  name: string
  startAt: Date | null
  endAt: Date | null
}

export interface PromoScopeData {
  isActive?: boolean
  productId?: string | null
  categoryId?: string | null
  startAt?: string | null
  endAt?: string | null
}

/**
 * Verifica se os dados de uma nova promoção conflitam com as candidatas existentes.
 * Retorna mensagem de erro se houver conflito, ou null se estiver tudo ok.
 */
export function detectPromoOverlap(
  incoming: PromoScopeData,
  candidates: PromoConflictCandidate[]
): string | null {
  if (!incoming.isActive && incoming.isActive !== undefined) return null

  const hasScope = incoming.productId || incoming.categoryId
  if (!hasScope || candidates.length === 0) return null

  const newStart = incoming.startAt ? new Date(incoming.startAt) : null
  const newEnd = incoming.endAt ? new Date(incoming.endAt) : null

  for (const c of candidates) {
    const aStart = newStart ?? new Date(0)
    const aEnd = newEnd ?? new Date("2999-12-31")
    const bStart = c.startAt ?? new Date(0)
    const bEnd = c.endAt ?? new Date("2999-12-31")

    if (aStart <= bEnd && aEnd >= bStart) {
      const fmtDate = (d: Date | null) =>
        d ? d.toLocaleDateString("pt-BR") : null

      return `Período conflita com a promoção "${c.name}"` +
        (c.startAt || c.endAt
          ? ` (${fmtDate(c.startAt) ?? "sem início"} – ${fmtDate(c.endAt) ?? "sem fim"})`
          : " (vigência permanente)") + "."
    }
  }

  return null
}
