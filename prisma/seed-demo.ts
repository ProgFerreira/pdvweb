/**
 * Popula o banco com volume alto de dados para testes (categorias, produtos,
 * clientes, caixas e vendas). Execute após o seed base: npm run db:seed-demo
 */
import {
  PrismaClient,
  SaleStatus,
  PaymentMethod,
  CashStatus,
  UserRole,
} from "@prisma/client"

const prisma = new PrismaClient()

const COLORS = [
  "#f97316", "#84cc16", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#eab308", "#ef4444", "#6366f1", "#64748b",
  "#a855f7", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e",
]

const CATEGORY_DEFS: { name: string; description: string; products: string[] }[] = [
  {
    name: "Galetos",
    description: "Galetos e aves assadas na brasa",
    products: [
      "Galeto Inteiro", "Galeto Meio", "Galeto Quarto", "Frango Caipira Inteiro",
      "Frango Caipira Meio", "Galeto Temperado Especial", "Galeto com Ervas",
      "Galeto Desossado", "Galeto Duplo", "Galeto Kids",
    ],
  },
  {
    name: "Acompanhamentos",
    description: "Porções e acompanhamentos",
    products: [
      "Porção de Fritas", "Purê de Batata", "Arroz Branco", "Farofa Caseira",
      "Vinagrete", "Salada Verde", "Mandioca Cozida", "Polenta Frita",
      "Legumes Grelhados", "Batata Rústica",
    ],
  },
  {
    name: "Bebidas",
    description: "Bebidas em geral",
    products: [
      "Refrigerante Lata", "Refrigerante 600ml", "Refrigerante 2L", "Água Mineral",
      "Água com Gás", "Chá Gelado", "Energético", "Suco de Caixa",
      "Isotônico", "H2OH Limoneto",
    ],
  },
  {
    name: "Combos",
    description: "Combos e promoções",
    products: [
      "Combo Galeto Inteiro", "Combo Galeto Meio", "Combo Família",
      "Combo Casal", "Combo Executivo", "Combo Kids", "Combo Delivery",
      "Combo Fim de Semana", "Combo Happy Hour", "Combo Duplo Galeto",
    ],
  },
  {
    name: "Sobremesas",
    description: "Doces e sobremesas",
    products: [
      "Pudim de Leite", "Gelatina", "Mousse de Chocolate", "Brownie",
      "Sorvete 2 Bolas", "Pavê", "Torta de Limão", "Brigadeiro (un)",
      "Salada de Frutas", "Petit Gateau",
    ],
  },
  {
    name: "Saladas",
    description: "Saladas frescas",
    products: [
      "Salada Caesar", "Salada Tropical", "Salada de Frango",
      "Salada Caprese", "Salada Mista", "Salada com Queijo",
      "Salada de Atum", "Salada Grega", "Salada Verde Grande", "Salada Especial",
    ],
  },
  {
    name: "Molhos",
    description: "Molhos e temperos",
    products: [
      "Molho Barbecue", "Molho Mostarda e Mel", "Molho Picante",
      "Molho Verde", "Maionese Caseira", "Ketchup", "Mostarda",
      "Molho Chimichurri", "Molho Alho", "Molho Especial da Casa",
    ],
  },
  {
    name: "Porções",
    description: "Porções para compartilhar",
    products: [
      "Porção de Calabresa", "Porção de Queijo", "Porção de Isca de Frango",
      "Porção de Mandioca Frita", "Porção de Coxinha (6un)", "Porção de Bolinho",
      "Porção de Pastel (4un)", "Porção de Batata Recheada", "Porção Mista",
      "Porção de Frango à Passarinho",
    ],
  },
  {
    name: "Cervejas",
    description: "Cervejas geladas",
    products: [
      "Chopp 300ml", "Chopp 500ml", "Cerveja Long Neck", "Cerveja Lata",
      "Cerveja Artesanal IPA", "Cerveja Artesanal Pilsen", "Cerveja Zero",
      "Cerveja Importada", "Balde 5 Long Necks", "Balde 10 Long Necks",
    ],
  },
  {
    name: "Sucos",
    description: "Sucos naturais",
    products: [
      "Suco de Laranja", "Suco de Limão", "Suco de Maracujá", "Suco de Abacaxi",
      "Suco de Acerola", "Suco de Melancia", "Suco de Morango", "Suco de Goiaba",
      "Suco Detox", "Suco Verde",
    ],
  },
  {
    name: "Pratos Executivos",
    description: "Almoço executivo",
    products: [
      "Executivo Galeto", "Executivo Frango", "Executivo Carne",
      "Executivo Peixe", "Executivo Vegetariano", "Executivo Fit",
      "Executivo Duplo", "Executivo Premium", "Executivo Light", "Executivo Kids",
    ],
  },
  {
    name: "Kids",
    description: "Cardápio infantil",
    products: [
      "Kids Galeto", "Kids Frango Empanado", "Kids Mini Hambúrguer",
      "Kids Nuggets", "Kids Macarrão", "Kids Suco", "Kids Sorvete",
      "Kids Batata Smile", "Kids Hot Dog", "Kids Combo Feliz",
    ],
  },
  {
    name: "Promoções",
    description: "Itens em promoção",
    products: [
      "Promo Terça Galeto", "Promo Quarta Bebida", "Promo Quinta Combo",
      "Promo Sexta Família", "Promo Sábado Chopp", "Promo Domingo Sobremesa",
      "Promo Delivery 10%", "Promo Aniversariante", "Promo Primeira Compra",
      "Promo Fidelidade",
    ],
  },
  {
    name: "Cafés",
    description: "Cafés e quentes",
    products: [
      "Café Expresso", "Café com Leite", "Cappuccino", "Chocolate Quente",
      "Chá de Camomila", "Chá Preto", "Café Duplo", "Mocaccino",
      "Café Gelado", "Leite com Chocolate",
    ],
  },
  {
    name: "Extras",
    description: "Itens avulsos",
    products: [
      "Pão de Alho", "Ovo Frito", "Queijo Extra", "Bacon Extra",
      "Embalagem Delivery", "Talheres Descartáveis", "Guardanapo Extra",
      "Gelo (saco)", "Limão", "Carvão (un)",
    ],
  },
]

const FIRST_NAMES = [
  "Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena",
  "Igor", "Juliana", "Lucas", "Mariana", "Nicolas", "Patricia", "Rafael", "Sandra",
  "Thiago", "Vanessa", "Wagner", "Yasmin", "André", "Beatriz", "Caio", "Débora",
]

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira",
  "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Gomes", "Martins", "Rocha",
]

const NEIGHBORHOODS = [
  "Centro", "Jardim América", "Vila Nova", "Bela Vista", "Parque Industrial",
  "Alto da Boa Vista", "São José", "Morumbi", "Vila Mariana", "Pinheiros",
]

const STATUSES: SaleStatus[] = [
  "ENTREGUE", "ENTREGUE", "ENTREGUE", "ENTREGUE", "ENTREGUE", "ENTREGUE", "ENTREGUE",
  "PRONTO", "PRONTO",
  "EM_PREPARO", "EM_PREPARO",
  "AGUARDANDO",
  "CANCELADO",
]

const PAYMENT_METHODS: PaymentMethod[] = [
  "DINHEIRO", "PIX", "DEBITO", "CREDITO", "VALE",
]

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysBack: number): Date {
  const now = Date.now()
  const offset = randInt(0, daysBack * 24 * 60) * 60 * 1000
  return new Date(now - offset)
}

function price(base: number): number {
  return Math.round((base + randInt(-2, 5) * 0.5) * 100) / 100
}

async function main() {
  console.log("🌱 Seed demo — populando dados de teste em volume...")

  const tenant = await prisma.tenant.findUnique({ where: { slug: "default" } })
  if (!tenant) {
    console.error("❌ Tenant 'default' não encontrado. Execute primeiro: npm run db:seed")
    process.exit(1)
  }

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, isActive: true },
  })
  if (users.length === 0) {
    console.error("❌ Nenhum usuário encontrado. Execute primeiro: npm run db:seed")
    process.exit(1)
  }

  const caixaUsers = users.filter((u) => ["CAIXA", "ATENDENTE", "GERENTE", "ADMIN"].includes(u.role))
  const defaultUser = caixaUsers[0] ?? users[0]

  // ─── Categorias e produtos ─────────────────────────────────────────────────
  console.log("📦 Criando categorias e produtos...")
  const categoryRecords: { id: string; name: string }[] = []

  for (let ci = 0; ci < CATEGORY_DEFS.length; ci++) {
    const def = CATEGORY_DEFS[ci]
    const cat = await prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: def.name } },
      update: { description: def.description, color: COLORS[ci % COLORS.length] },
      create: {
        tenantId: tenant.id,
        name: def.name,
        description: def.description,
        color: COLORS[ci % COLORS.length],
      },
    })
    categoryRecords.push({ id: cat.id, name: cat.name })

    const prefix = def.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .slice(0, 4)
      .toUpperCase()

    for (let pi = 0; pi < def.products.length; pi++) {
      const code = `${prefix}${String(pi + 1).padStart(3, "0")}`
      const basePrice = def.name === "Combos" || def.name === "Pratos Executivos"
        ? randInt(35, 65)
        : def.name === "Galetos"
          ? randInt(18, 55)
          : def.name === "Bebidas" || def.name === "Molhos" || def.name === "Extras"
            ? randInt(3, 15)
            : randInt(8, 35)

      await prisma.product.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code } },
        update: {
          name: def.products[pi],
          price: basePrice,
          stock: 500,
          isActive: true,
          deletedAt: null,
        },
        create: {
          tenantId: tenant.id,
          code,
          name: def.products[pi],
          description: `${def.products[pi]} — ${def.description}`,
          categoryId: cat.id,
          price: basePrice,
          cost: Math.round(basePrice * 0.45 * 100) / 100,
          stock: 500,
          minStock: randInt(5, 20),
          isActive: true,
        },
      })
    }
  }

  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, deletedAt: null, isActive: true },
    select: { id: true, price: true, name: true },
  })

  console.log(`   ✅ ${categoryRecords.length} categorias, ${products.length} produtos`)

  // ─── Clientes ─────────────────────────────────────────────────────────────
  console.log("👥 Criando clientes...")
  const customerIds: string[] = []

  for (let i = 0; i < 80; i++) {
    const name = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`
    const cpf = `${String(randInt(100, 999)).padStart(3, "0")}.${String(randInt(100, 999)).padStart(3, "0")}.${String(randInt(100, 999)).padStart(3, "0")}-${String(randInt(10, 99)).padStart(2, "0")}`
    const phone = `(11) 9${randInt(1000, 9999)}-${String(randInt(1000, 9999)).padStart(4, "0")}`

    const customer = await prisma.customer.upsert({
      where: { tenantId_cpf: { tenantId: tenant.id, cpf } },
      update: { name, phone },
      create: {
        tenantId: tenant.id,
        name,
        phone,
        cpf,
        neighborhood: rand(NEIGHBORHOODS),
        city: "São Paulo",
        address: `Rua ${rand(LAST_NAMES)}, ${randInt(10, 999)}`,
      },
    })
    customerIds.push(customer.id)
  }

  console.log(`   ✅ ${customerIds.length} clientes`)

  // ─── Fornecedores extras ────────────────────────────────────────────────────
  console.log("🏭 Criando fornecedores...")
  const supplierTypes = ["Aves", "Bebidas", "Hortifruti", "Embalagens", "Limpeza", "Temperos"]
  for (let i = 0; i < 12; i++) {
    await prisma.supplier.upsert({
      where: { id: `supplier-demo-${String(i + 1).padStart(2, "0")}` },
      update: {},
      create: {
        id: `supplier-demo-${String(i + 1).padStart(2, "0")}`,
        tenantId: tenant.id,
        name: `Fornecedor ${supplierTypes[i % supplierTypes.length]} ${i + 1} Ltda`,
        document: `${String(randInt(10, 99)).padStart(2, "0")}.${String(randInt(100, 999)).padStart(3, "0")}.${String(randInt(100, 999)).padStart(3, "0")}/0001-${String(randInt(10, 99)).padStart(2, "0")}`,
        phone: `(11) ${randInt(3000, 4999)}-${String(randInt(1000, 9999)).padStart(4, "0")}`,
        supplyType: supplierTypes[i % supplierTypes.length],
      },
    })
  }

  // ─── Caixas ─────────────────────────────────────────────────────────────────
  console.log("💰 Criando registros de caixa...")
  const cashRegisterIds: string[] = []

  for (let i = 0; i < 8; i++) {
    const user = caixaUsers[i % caixaUsers.length] ?? defaultUser
    const isOpen = i < 2
    const openedAt = randomDate(30)
    const closedAt = isOpen ? null : new Date(openedAt.getTime() + randInt(4, 10) * 60 * 60 * 1000)

    const cash = await prisma.cashRegister.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        status: isOpen ? CashStatus.ABERTO : CashStatus.FECHADO,
        initialAmount: randInt(100, 300),
        totalCash: randInt(500, 3000),
        totalPix: randInt(800, 5000),
        totalDebit: randInt(300, 2000),
        totalCredit: randInt(400, 2500),
        totalVoucher: randInt(0, 500),
        totalSales: randInt(2000, 8000),
        openedAt,
        closedAt,
        notes: isOpen ? "Caixa aberto — seed demo" : "Caixa fechado — seed demo",
      },
    })
    cashRegisterIds.push(cash.id)
  }

  const openCashIds = cashRegisterIds.slice(0, 2)
  console.log(`   ✅ ${cashRegisterIds.length} caixas (${openCashIds.length} abertos)`)

  // ─── Vendas ─────────────────────────────────────────────────────────────────
  const SALE_COUNT = 1200
  const DAYS_BACK = 90
  const BATCH = 30

  const lastSale = await prisma.sale.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })
  let orderNumber = (lastSale?.orderNumber ?? 0) + 1

  console.log(`🛒 Criando ${SALE_COUNT} vendas (últimos ${DAYS_BACK} dias)...`)

  let created = 0
  for (let batch = 0; batch < Math.ceil(SALE_COUNT / BATCH); batch++) {
    const batchSize = Math.min(BATCH, SALE_COUNT - created)

    await prisma.$transaction(async (tx) => {
      for (let b = 0; b < batchSize; b++) {
        const status = rand(STATUSES)
        const user = rand(caixaUsers)
        const itemCount = randInt(1, 5)
        const selectedProducts = Array.from({ length: itemCount }, () => rand(products))

        const saleItems = selectedProducts.map((p) => {
          const qty = randInt(1, 3)
          const unitPrice = Number(p.price)
          const itemDiscount = Math.random() < 0.15 ? randInt(1, 5) : 0
          return {
            productId: p.id,
            quantity: qty,
            unitPrice,
            discount: itemDiscount,
            total: unitPrice * qty - itemDiscount,
          }
        })

        const subtotal = saleItems.reduce((s, i) => s + i.total, 0)
        const discount = Math.random() < 0.1 ? randInt(2, 10) : 0
        const addition = Math.random() < 0.05 ? randInt(2, 8) : 0
        const total = Math.max(0, subtotal - discount + addition)

        const method = rand(PAYMENT_METHODS)
        const paidAmount = method === "DINHEIRO"
          ? Math.ceil(total / 5) * 5
          : total

        const createdAt = randomDate(DAYS_BACK)
        const hasCustomer = Math.random() < 0.6
        const cashId = Math.random() < 0.7 ? rand(openCashIds) : null

        await tx.sale.create({
          data: {
            tenantId: tenant.id,
            orderNumber: orderNumber++,
            userId: user.id,
            customerId: hasCustomer ? rand(customerIds) : null,
            cashRegisterId: cashId,
            status,
            subtotal,
            discount,
            addition,
            total,
            notes: Math.random() < 0.1 ? "Pedido seed demo" : null,
            cancelReason: status === "CANCELADO" ? "Cancelado para teste" : null,
            printedAt: ["ENTREGUE", "PRONTO"].includes(status) ? createdAt : null,
            createdAt,
            updatedAt: createdAt,
            items: { create: saleItems },
            payments: {
              create: [{
                method,
                amount: paidAmount,
                change: method === "DINHEIRO" ? Math.max(0, paidAmount - total) : 0,
                createdAt,
              }],
            },
          },
        })
      }
    })

    created += batchSize
    if (created % 150 === 0 || created === SALE_COUNT) {
      console.log(`   … ${created}/${SALE_COUNT} vendas`)
    }
  }

  // ─── Resumo ─────────────────────────────────────────────────────────────────
  const [catCount, prodCount, custCount, saleCount, cashCount] = await Promise.all([
    prisma.category.count({ where: { tenantId: tenant.id } }),
    prisma.product.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    prisma.customer.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    prisma.sale.count({ where: { tenantId: tenant.id } }),
    prisma.cashRegister.count({ where: { tenantId: tenant.id } }),
  ])

  const salesByStatus = await prisma.sale.groupBy({
    by: ["status"],
    where: { tenantId: tenant.id },
    _count: true,
  })

  console.log("")
  console.log("🎉 Seed demo concluído!")
  console.log("─────────────────────────────────────")
  console.log(`  Categorias:  ${catCount}`)
  console.log(`  Produtos:    ${prodCount}`)
  console.log(`  Clientes:    ${custCount}`)
  console.log(`  Vendas:      ${saleCount}`)
  console.log(`  Caixas:      ${cashCount}`)
  console.log("  Vendas por status:")
  for (const row of salesByStatus) {
    console.log(`    ${row.status}: ${row._count}`)
  }
  console.log("─────────────────────────────────────")
  console.log("  Login: admin@pdvgaletos.com / admin123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
