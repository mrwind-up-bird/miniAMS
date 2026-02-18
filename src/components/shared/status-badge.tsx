import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type CustomerStatus = "lead" | "active" | "on_hold" | "churned"
type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled"
type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"

interface StatusBadgeProps {
  status: string
  type: "customer" | "project" | "invoice"
  label: string
}

const customerStatusStyles: Record<CustomerStatus, string> = {
  lead: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  active: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  on_hold: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  churned: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

const projectStatusStyles: Record<ProjectStatus, string> = {
  planned: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  active: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  on_hold: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  completed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  sent: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  paid: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  overdue: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

export function StatusBadge({ status, type, label }: StatusBadgeProps) {
  const stylesMap = {
    customer: customerStatusStyles,
    project: projectStatusStyles,
    invoice: invoiceStatusStyles,
  }
  const styles = stylesMap[type][status as keyof (typeof stylesMap)[typeof type]]

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", styles)}
    >
      {label}
    </Badge>
  )
}
