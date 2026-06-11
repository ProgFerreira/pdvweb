import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { PERMISSIONS } from "../lib/permissions"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...")

  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "PDV Galetos",
      slug: "default",
      plan: "basic",
    },
  })

  await prisma.settings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      storeName: "PDV Galetos",
      address: "Rua Principal, 100",
      phone: "(11) 99999-0000",
      printFooter: "Obrigado pela preferência!",
      openHours: "Seg-Dom 10h às 22h",
    },
  })

  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    })
  }

  const allPerms = await prisma.permission.findMany()
  const roles = ["ADMIN", "GERENTE", "CAIXA", "ATENDENTE", "COZINHA"] as const

  const rolePermMap: Record<string, string[]> = {
    ADMIN: PERMISSIONS as unknown as string[],
    GERENTE: (PERMISSIONS.filter((p) => p !== "usuarios.excluir") as unknown as string[]),
    CAIXA: [
      "dashboard.ver", "pdv.vender", "fila.gerir", "caixa.operar", "vendas.ver",
      "produtos.ver", "clientes.ver", "clientes.crud",
    ],
    ATENDENTE: [
      "dashboard.ver", "pdv.vender", "fila.gerir", "vendas.ver",
      "produtos.ver", "clientes.ver", "clientes.crud",
    ],
    COZINHA: ["fila.gerir", "produtos.ver"],
  }

  await prisma.rolePermission.deleteMany()
  for (const role of roles) {
    const codes = rolePermMap[role] ?? []
    for (const code of codes) {
      const perm = allPerms.find((p) => p.code === code)
      if (perm) {
        await prisma.rolePermission.create({
          data: { role, permissionId: perm.id },
        })
      }
    }
  }

  console.log("✅ Tenant, settings e permissões criados")

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Galetos" } },
      update: {},
      create: { tenantId: tenant.id, name: "Galetos", description: "Galetos e aves assadas", color: "#f97316" },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Acompanhamentos" } },
      update: {},
      create: { tenantId: tenant.id, name: "Acompanhamentos", description: "Porções e acompanhamentos", color: "#84cc16" },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Bebidas" } },
      update: {},
      create: { tenantId: tenant.id, name: "Bebidas", description: "Bebidas em geral", color: "#3b82f6" },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Combos" } },
      update: {},
      create: { tenantId: tenant.id, name: "Combos", description: "Combos e promoções", color: "#8b5cf6" },
    }),
    prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Sobremesas" } },
      update: {},
      create: { tenantId: tenant.id, name: "Sobremesas", description: "Doces e sobremesas", color: "#ec4899" },
    }),
  ])

  const [catGaletos, catAcomp, catBebidas, catCombos] = categories

  const produtos = [
    { code: "GAL001", name: "Galeto Inteiro", description: "Galeto inteiro assado na brasa", categoryId: catGaletos.id, price: 38.9, cost: 18, stock: 50, minStock: 10 },
    { code: "GAL002", name: "Galeto Meio", description: "Meio galeto assado na brasa", categoryId: catGaletos.id, price: 22.9, cost: 10, stock: 50, minStock: 10 },
    { code: "GAL003", name: "Galeto Frango Inteiro", description: "Frango caipira inteiro assado", categoryId: catGaletos.id, price: 45, cost: 22, stock: 30, minStock: 5 },
    { code: "ACP001", name: "Porção de Fritas", description: "Batata frita crocante 300g", categoryId: catAcomp.id, price: 18, cost: 5, stock: 100, minStock: 20 },
    { code: "BEB001", name: "Refrigerante Lata", description: "Refrigerante lata 350ml", categoryId: catBebidas.id, price: 6, cost: 2.5, stock: 200, minStock: 30 },
    { code: "COM001", name: "Combo Galeto Inteiro", description: "Galeto + 2 acomp + bebida", categoryId: catCombos.id, price: 55, cost: 28, stock: 999, minStock: 0 },
  ]

  for (const produto of produtos) {
    await prisma.product.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: produto.code } },
      update: {},
      create: { tenantId: tenant.id, ...produto },
    })
  }

  console.log("✅ Categorias e produtos criados")

  for (let n = 1; n <= 8; n++) {
    await prisma.table.upsert({
      where: { tenantId_number: { tenantId: tenant.id, number: n } },
      update: {},
      create: { tenantId: tenant.id, number: n, name: `Mesa ${n}`, capacity: 4 },
    })
  }
  console.log("✅ Mesas criadas")

  const adminPassword = await bcrypt.hash("admin123", 12)
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@pdvgaletos.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Administrador",
      email: "admin@pdvgaletos.com",
      password: adminPassword,
      role: "ADMIN",
    },
  })

  const caixaPassword = await bcrypt.hash("caixa123", 12)
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "caixa@pdvgaletos.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Operador de Caixa",
      email: "caixa@pdvgaletos.com",
      password: caixaPassword,
      role: "CAIXA",
    },
  })

  const cozinhaPassword = await bcrypt.hash("cozinha123", 12)
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "cozinha@pdvgaletos.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Equipe Cozinha",
      email: "cozinha@pdvgaletos.com",
      password: cozinhaPassword,
      role: "COZINHA",
    },
  })

  await prisma.supplier.upsert({
    where: { id: "supplier-seed-01" },
    update: {},
    create: {
      id: "supplier-seed-01",
      tenantId: tenant.id,
      name: "Avícola Central Ltda",
      document: "12.345.678/0001-90",
      phone: "(11) 3456-7890",
      email: "contato@avicola.com",
      supplyType: "Aves",
    },
  })

  console.log("✅ Usuários e fornecedores criados")
  console.log("")
  console.log("🎉 Seed concluído!")
  console.log("  Admin:   admin@pdvgaletos.com  / admin123")
  console.log("  Caixa:   caixa@pdvgaletos.com  / caixa123")
  console.log("  Cozinha: cozinha@pdvgaletos.com / cozinha123")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
