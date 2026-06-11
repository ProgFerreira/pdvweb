import { Sidebar, type SidebarProps } from "./sidebar"
import { Topbar, type TopbarProps } from "./topbar"

export interface DashboardLayoutProps extends SidebarProps, TopbarProps {
  children: React.ReactNode
}

/** Layout padrão: sidebar + topbar + área de conteúdo. Sem dependência de auth. */
export function DashboardLayout({
  children,
  navItems,
  brandName,
  brandSubtitle,
  brandIcon,
  filterNavItem,
  title,
  userName,
  userSubtitle,
  onSignOut,
  showNotifications,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        navItems={navItems}
        brandName={brandName}
        brandSubtitle={brandSubtitle}
        brandIcon={brandIcon}
        filterNavItem={filterNavItem}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          title={title}
          userName={userName}
          userSubtitle={userSubtitle}
          onSignOut={onSignOut}
          showNotifications={showNotifications}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
