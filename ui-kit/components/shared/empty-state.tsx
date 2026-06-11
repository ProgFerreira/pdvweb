import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground/70 text-sm mt-1">{description}</p>
      )}
    </div>
  )
}
