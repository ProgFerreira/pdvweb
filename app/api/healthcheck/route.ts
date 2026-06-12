import { NextResponse } from "next/server"

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    auth_url: process.env.AUTH_URL ? "✓ definida" : "✗ ausente",
    auth_secret: process.env.AUTH_SECRET ? `✓ ${process.env.AUTH_SECRET.length} chars` : "✗ ausente",
    database_url: process.env.DATABASE_URL
      ? `✓ ${process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@")}`
      : "✗ ausente",
  }

  // Testa conexão com o banco
  try {
    const { prisma } = await import("@/lib/prisma")
    await prisma.$queryRaw`SELECT 1 as ok`
    checks.database = "✓ conectado"

    const userCount = await prisma.user.count()
    checks.users = `✓ ${userCount} usuário(s)`

    const tenantCount = await prisma.tenant.count()
    checks.tenants = `✓ ${tenantCount} tenant(s)`
  } catch (err) {
    checks.database = `✗ ERRO: ${err instanceof Error ? err.message : String(err)}`
  }

  const allOk = !String(checks.database).startsWith("✗")

  return NextResponse.json(checks, { status: allOk ? 200 : 500 })
}
