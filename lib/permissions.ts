import type { UserRole } from "@prisma/client"

export const PERMISSIONS = [
  "dashboard.ver",
  "pdv.vender",
  "fila.gerir",
  "caixa.operar",
  "vendas.ver",
  "estoque.ver",
  "estoque.movimentar",
  "compras.ver",
  "compras.crud",
  "contas_pagar.ver",
  "contas_pagar.crud",
  "contas_pagar.pagar",
  "notas_fiscais.ver",
  "notas_fiscais.crud",
  "produtos.ver",
  "produtos.crud",
  "categorias.crud",
  "clientes.ver",
  "clientes.crud",
  "fornecedores.ver",
  "fornecedores.crud",
  "relatorios.ver",
  "mesas.ver",
  "mesas.crud",
  "promocoes.ver",
  "promocoes.crud",
  "fidelidade.ver",
  "usuarios.crud",
  "usuarios.excluir",
  "configuracoes.editar",
  "auditoria.ver",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  GERENTE: PERMISSIONS.filter(
    (p) => p !== "usuarios.excluir"
  ),
  CAIXA: [
    "dashboard.ver",
    "pdv.vender",
    "fila.gerir",
    "caixa.operar",
    "vendas.ver",
    "produtos.ver",
    "clientes.ver",
    "clientes.crud",
  ],
  ATENDENTE: [
    "dashboard.ver",
    "pdv.vender",
    "fila.gerir",
    "vendas.ver",
    "produtos.ver",
    "clientes.ver",
    "clientes.crud",
  ],
  COZINHA: ["fila.gerir", "produtos.ver"],
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as UserRole]
  if (!perms) return false
  return perms.includes(permission)
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export const NAV_PERMISSIONS: Record<string, Permission> = {
  "/": "dashboard.ver",
  "/pdv": "pdv.vender",
  "/fila": "fila.gerir",
  "/caixa": "caixa.operar",
  "/caixa/operacao": "caixa.operar",
  "/vendas": "vendas.ver",
  "/estoque": "estoque.ver",
  "/compras": "compras.ver",
  "/contas-pagar": "contas_pagar.ver",
  "/notas-fiscais-compra": "notas_fiscais.ver",
  "/produtos": "produtos.ver",
  "/clientes": "clientes.ver",
  "/fornecedores": "fornecedores.ver",
  "/mesas": "mesas.ver",
  "/promocoes": "promocoes.ver",
  "/relatorios": "relatorios.ver",
  "/usuarios": "usuarios.crud",
  "/configuracoes": "configuracoes.editar",
  "/categorias": "categorias.crud",
  "/auditoria": "auditoria.ver",
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  CAIXA: "Caixa",
  ATENDENTE: "Atendente",
  COZINHA: "Cozinha",
}
