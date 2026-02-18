"use client"

import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface InvoiceListItem {
  id: string
  number: string
  status: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxTotal: number
  total: number
  currency: string
  customer: { id: string; name: string }
  _count?: { items: number }
}

interface InvoiceListProps {
  invoices: InvoiceListItem[]
}

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  sent: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  paid: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  overdue: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700",
}

function InvoiceStatusBadge({ status, label }: { status: string; label: string }) {
  const styles = invoiceStatusStyles[status as InvoiceStatus] ?? invoiceStatusStyles.draft
  return (
    <Badge variant="outline" className={cn("border font-medium", styles)}>
      {label}
    </Badge>
  )
}

function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  const t = useTranslations("invoices")
  const tc = useTranslations("common")
  const locale = useLocale()

  if (invoices.length === 0) return null

  function statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: t("statusDraft"),
      sent: t("statusSent"),
      paid: t("statusPaid"),
      overdue: t("statusOverdue"),
      cancelled: t("statusCancelled"),
    }
    return map[status] ?? status
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="grid gap-3 md:hidden pb-20">
        {invoices.map((invoice) => (
          <Link
            key={invoice.id}
            href={`/invoices/${invoice.id}`}
            className="block"
          >
            <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-2 active:opacity-70 transition-opacity">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-base leading-tight block">
                    {invoice.number}
                  </span>
                  <span className="text-sm text-muted-foreground truncate block mt-0.5">
                    {invoice.customer.name}
                  </span>
                </div>
                <InvoiceStatusBadge
                  status={invoice.status}
                  label={statusLabel(invoice.status)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("dueDate")}: {formatDate(invoice.dueDate, locale)}
                </span>
                <span className="font-semibold tabular-nums text-sm">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("number")}</TableHead>
              <TableHead>{t("customer")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("issueDate")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead className="text-right">{t("total")}</TableHead>
              <TableHead className="w-10">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-medium hover:underline underline-offset-4 tabular-nums"
                  >
                    {invoice.number}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invoice.customer.name}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge
                    status={invoice.status}
                    label={statusLabel(invoice.status)}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(invoice.issueDate, locale)}
                </TableCell>
                <TableCell
                  className={cn(
                    "whitespace-nowrap",
                    invoice.status === "overdue"
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {formatDate(invoice.dueDate, locale)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tc("edit")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
