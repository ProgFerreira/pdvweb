# UI Kit — PDV Galetos

Pacote portátil com estilos, componentes de layout e UI baseados no projeto PDV. Copie a pasta inteira para outro projeto ou use apenas o CSS compilado em PHP/HTML.

## Conteúdo

```
ui-kit/
├── styles/globals.css      # Tokens CSS + classes utilitárias (.kpi-card, .filter-card, etc.)
├── tailwind.config.ts      # Tema Tailwind (cores, radius)
├── postcss.config.js
├── lib/utils.ts            # Função cn()
├── components/
│   ├── layout/             # Sidebar, Topbar, DashboardLayout
│   ├── shared/             # PageHeader, DataTable, EmptyState
│   └── ui/                 # Button, Input, Card, Dialog, etc.
├── config/nav.example.ts   # Exemplo de menu (opcional)
├── examples/               # Exemplos de uso
├── dist/                   # CSS compilado (após npm run build:css)
└── scripts/build-css.mjs
```

## Opção A — Next.js / React

### 1. Copiar arquivos

Copie para a raiz do novo projeto (mesma estrutura):

- `ui-kit/styles/globals.css` → `app/globals.css` (ou importe de `ui-kit/styles`)
- `ui-kit/tailwind.config.ts` → mesclar com seu `tailwind.config` ou substituir
- `ui-kit/postcss.config.js`
- `ui-kit/lib/utils.ts` → `lib/utils.ts`
- `ui-kit/components/` → `components/`

### 2. Dependências

```bash
npm install tailwindcss autoprefixer postcss clsx tailwind-merge class-variance-authority lucide-react sweetalert2
npm install @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-toast
```

### 3. Alias TypeScript

Em `tsconfig.json`:

```json
"paths": { "@/*": ["./*"] }
```

### 4. Layout raiz

```tsx
// app/layout.tsx
import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

### 5. Layout com sidebar

```tsx
// app/(dashboard)/layout.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { defaultNavItems } from "@/config/nav"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      brandName="Meu Sistema"
      brandSubtitle="v1.0.0"
      navItems={defaultNavItems}
      userName="Usuário"
      userRole="Admin"
      onSignOut={() => (window.location.href = "/login")}
    >
      {children}
    </DashboardLayout>
  )
}
```

Veja `examples/next-dashboard-layout.tsx` e `config/nav.example.ts`.

## Opção B — PHP / HTML estático

### 1. Gerar CSS

Na raiz do projeto PDV (onde está `node_modules`):

```bash
npm run ui-kit:build
```

Ou dentro de `ui-kit/`:

```bash
node scripts/build-css.mjs
```

Saída: `ui-kit/dist/theme.min.css`

### 2. Incluir no HTML

```html
<link rel="stylesheet" href="caminho/ui-kit/dist/theme.min.css" />
```

### 3. Classes disponíveis

- Layout: use o HTML de `examples/static-demo.html` como referência
- Componentes: `.page-header`, `.btn-primary`, `.kpi-card`, `.filter-card`, `.section-card`, `.table-head-soft`, `.filter-grid`, `.table-wrapper`
- Cores: `bg-primary`, `text-muted-foreground`, `bg-card`, etc. (Tailwind com variáveis CSS)

**Limitação:** Dialog, Select e Toast do Radix exigem React. Em PHP, use HTML nativo ou SweetAlert2 para modais.

## Personalização

| Item | Onde alterar |
|------|----------------|
| Cor primária (laranja) | `styles/globals.css` → `--primary` |
| Menu lateral | `config/nav.example.ts` ou prop `navItems` do Sidebar |
| Nome do sistema | props `brandName` / `brandSubtitle` do Sidebar |
| Filtro por permissão | prop `filterNavItem` do Sidebar |

## SweetAlert2

O `globals.css` importa SweetAlert2. Para alertas no cliente:

```ts
import Swal from "sweetalert2"
await Swal.fire({ title: "Salvo!", icon: "success" })
```

## Versão

Extraído do PDV Galetos — maio/2026.
