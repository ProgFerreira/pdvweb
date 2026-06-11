import { describe, it, expect } from "vitest"
import { hasPermission } from "./permissions"

describe("permissions", () => {
  it("ADMIN tem todas as permissões", () => {
    expect(hasPermission("ADMIN", "usuarios.excluir")).toBe(true)
    expect(hasPermission("ADMIN", "configuracoes.editar")).toBe(true)
  })

  it("COZINHA não vende no PDV", () => {
    expect(hasPermission("COZINHA", "pdv.vender")).toBe(false)
    expect(hasPermission("COZINHA", "fila.gerir")).toBe(true)
  })

  it("CAIXA opera caixa", () => {
    expect(hasPermission("CAIXA", "caixa.operar")).toBe(true)
    expect(hasPermission("CAIXA", "produtos.crud")).toBe(false)
  })
})
