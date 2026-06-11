# PDV Galetos

Sistema de ponto de venda para galeteria — Next.js 15, Prisma (MySQL), NextAuth v5.

**Versão atual:** 1.0.0

## Requisitos

- Node.js 20+
- MySQL (WAMP ou similar)

## Instalação

```bash
npm install
cp .env.example .env.local
# Edite DATABASE_URL e AUTH_SECRET em .env.local
npm run db:push
npm run db:seed
npm run dev
```

Acesse: http://localhost:3000

## Credenciais (seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@pdvgaletos.com | admin123 |
| Caixa | caixa@pdvgaletos.com | caixa123 |
| Cozinha | cozinha@pdvgaletos.com | cozinha123 |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção |
| `npm run db:push` | Sincronizar schema Prisma |
| `npm run db:seed` | Dados iniciais |
| `npm run test` | Testes Vitest |

## Produção

Defina em `.env`:

- `DATABASE_URL`
- `AUTH_SECRET` (mín. 32 caracteres)
- `AUTH_URL` (URL pública, ex: `https://pdv.seudominio.com`)

## Changelog

Veja o histórico de versões em [CHANGELOG.md](./CHANGELOG.md).

## Deploy checklist

- [ ] `AUTH_SECRET` forte e único
- [ ] `AUTH_URL` com HTTPS
- [ ] Backup MySQL configurado
- [ ] Remover/alterar senhas do seed
- [ ] `npm run build` sem erros
