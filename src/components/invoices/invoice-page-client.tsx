"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { FileText, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceList } from "@/components/invoices/invoice-list"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { SearchBar } from "@/components/shared/search-bar"
import { EmptyState } from "@/components/shared/empty-state"

interface Invoice {
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

interface InvoicePageClientProps {
  invoices: Invoice[]
  total: number
  stats: {
    totalOutstanding: number
    overdueAmount: number
    paidThisMonth: number
    counts: { draft: number; sent: number; paid: number; overdue: number }
  }
  customers: { id: string; name: string }[]
}

function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function InvoicePageClient({
  invoices,
  stats,
  customers,
}: InvoicePageClientProps) {
  const t = useTranslations("invoices")
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  function openCreate() {
    setSheetOpen(true)
  }

  function handleSuccess() {
    router.refresh()
  }

  const totalInvoices =
    stats.counts.draft + stats.counts.sent + stats.counts.paid + stats.counts.overdue

  return (
    <>
      <div className="space-y-4 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <Button onClick={openCreate} className="min-h-11 shrink-0">
            {t("createInvoice")}
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {/* Total Outstanding */}
          <Card className="py-4">
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("totalOutstanding")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums leading-tight">
                {formatCurrency(stats.totalOutstanding)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.counts.sent} {t("sentInvoices")}
              </p>
            </CardContent>
          </Card>

          {/* Overdue Amount */}
          <Card className="py-4">
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("overdueAmount")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p
                className={`text-xl font-bold tabular-nums leading-tight ${
                  stats.overdueAmount > 0 ? "text-destructive" : ""
                }`}
              >
                {formatCurrency(stats.overdueAmount)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.counts.overdue} {t("overdueInvoices")}
              </p>
            </CardContent>
          </Card>

          {/* Paid This Month */}
          <Card className="py-4">
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("paidThisMonth")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums leading-tight">
                {formatCurrency(stats.paidThisMonth)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.counts.paid} {t("paidInvoices")}
              </p>
            </CardContent>
          </Card>

          {/* Total Count */}
          <Card className="py-4">
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("totalInvoices")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums leading-tight">
                {totalInvoices}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.counts.draft} {t("draftInvoices")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <SearchBar placeholder={t("title")} paramName="search" />

        {/* List or empty state */}
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("empty")}
            description={t("emptyDescription")}
            action={
              <Button onClick={openCreate} className="min-h-11">
                {t("createInvoice")}
              </Button>
            }
          />
        ) : (
          <InvoiceList invoices={invoices} />
        )}
      </div>

      <InvoiceForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customers={customers}
        onSuccess={handleSuccess}
      />
    </>
  )
}
