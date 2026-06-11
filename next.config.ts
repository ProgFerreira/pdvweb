import type { NextConfig } from "next"

// ─── Validação de variáveis de ambiente no boot ────────────────────────────────
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""

if (process.env.NODE_ENV === "production") {
  if (!secret || secret.length < 32) {
    throw new Error(
      "[PDV] AUTH_SECRET não definida ou muito curta (mínimo 32 caracteres). " +
      "Gere um segredo seguro com: openssl rand -base64 32"
    )
  }

  if (
    secret === "sua-chave-secreta-aqui-min-32-chars" ||
    secret === "dev-secret" ||
    secret.startsWith("dev-")
  ) {
    throw new Error(
      "[PDV] AUTH_SECRET contém um valor padrão de desenvolvimento. " +
      "Defina um segredo único no .env.local antes de ir para produção."
    )
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  }
}

export default nextConfig
