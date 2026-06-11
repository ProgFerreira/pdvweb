/** Ponto de entrada do UI Kit (após copiar para o projeto com alias @/) */

export { cn } from "./lib/utils"

export { Sidebar, type NavItem, type SidebarProps } from "./components/layout/sidebar"
export { Topbar, type TopbarProps } from "./components/layout/topbar"
export { DashboardLayout, type DashboardLayoutProps } from "./components/layout/dashboard-layout"
export { AuthLayout } from "./components/layout/auth-layout"

export { PageHeader } from "./components/shared/page-header"
export { EmptyState } from "./components/shared/empty-state"
export { DataTable } from "./components/shared/data-table"

export { Button, buttonVariants } from "./components/ui/button"
export { Input } from "./components/ui/input"
export { Label } from "./components/ui/label"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/card"
export { Badge, badgeVariants } from "./components/ui/badge"
export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "./components/ui/dialog"
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem } from "./components/ui/select"
export {
  AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger,
  AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "./components/ui/alert-dialog"
export {
  ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose,
} from "./components/ui/toast"
