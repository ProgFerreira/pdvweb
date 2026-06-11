import { cn } from "@/lib/utils"

interface Column<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Nenhum registro encontrado",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">{emptyMessage}</p>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-soft">
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3 text-left", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="border-b last:border-0 hover:bg-muted/50">
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
