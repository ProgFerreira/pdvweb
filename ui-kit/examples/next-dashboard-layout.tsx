/**
 * Exemplo de layout para Next.js App Router.
 * Copie para app/(dashboard)/layout.tsx e ajuste nav + usuário.
 */
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { defaultNavItems } from "@/config/nav"

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout
      brandName="Meu Sistema"
      brandSubtitle="v1.0.0"
      navItems={defaultNavItems}
      userName="João Silva"
      userSubtitle="Administrador"
      onSignOut={() => {
        window.location.href = "/login"
      }}
    >
      {children}
    </DashboardLayout>
  )
}
