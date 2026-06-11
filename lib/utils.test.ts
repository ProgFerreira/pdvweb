import { describe, it, expect } from "vitest"
import {
  formatCurrency,
  formatPhone,
  formatCPF,
  formatCNPJ,
  slugify,
  truncate,
  parseListResponse,
} from "./utils"

describe("formatCurrency", () => {
  it("formata valor zero", () => {
    expect(formatCurrency(0)).toMatch(/0,00/)
  })
  it("formata valor positivo", () => {
    expect(formatCurrency(1234.56)).toMatch(/1\.234,56/)
  })
  it("aceita string numérica", () => {
    expect(formatCurrency("99.9")).toMatch(/99,90/)
  })
})

describe("formatPhone", () => {
  it("formata celular com 11 dígitos", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321")
  })
  it("formata fixo com 10 dígitos", () => {
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890")
  })
  it("retorna sem formatação para número inválido", () => {
    expect(formatPhone("123")).toBe("123")
  })
  it("ignora caracteres não numéricos antes de formatar", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("(11) 98765-4321")
  })
})

describe("formatCPF", () => {
  it("formata CPF corretamente", () => {
    expect(formatCPF("12345678909")).toBe("123.456.789-09")
  })
})

describe("formatCNPJ", () => {
  it("formata CNPJ corretamente", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81")
  })
})

describe("slugify", () => {
  it("converte para minúsculas", () => {
    expect(slugify("FRANGO")).toBe("frango")
  })
  it("remove acentos", () => {
    expect(slugify("Frango Grelhado")).toBe("frango-grelhado")
  })
  it("substitui espaços por hífen", () => {
    expect(slugify("prato do dia")).toBe("prato-do-dia")
  })
  it("remove hífens no início e fim", () => {
    expect(slugify(" frango ")).toBe("frango")
  })
})

describe("truncate", () => {
  it("não corta string dentro do limite", () => {
    expect(truncate("abc", 5)).toBe("abc")
  })
  it("corta string acima do limite e adiciona ...", () => {
    expect(truncate("abcdef", 3)).toBe("abc...")
  })
  it("funciona exatamente no limite", () => {
    expect(truncate("abc", 3)).toBe("abc")
  })
})

describe("parseListResponse", () => {
  it("retorna array direto", () => {
    expect(parseListResponse([1, 2, 3])).toEqual([1, 2, 3])
  })
  it("extrai data de resposta paginada", () => {
    expect(parseListResponse({ data: [4, 5], total: 2 })).toEqual([4, 5])
  })
  it("retorna array vazio para payload inválido", () => {
    expect(parseListResponse(null)).toEqual([])
    expect(parseListResponse({})).toEqual([])
    expect(parseListResponse("string")).toEqual([])
  })
})
