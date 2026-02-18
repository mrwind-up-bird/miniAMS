"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Trash2, Ban } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Link } from "@/i18n/navigation"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { updateInvoiceStatus, deleteInvoice } from "@/lib/actions/invoices"
import { cn } from "@/lib/utils"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

interface InvoiceDetailProps {
  invoice: {
    id: string
    number: string
    status: string
    issueDate: string
    dueDate: string
    subtotal: number
    taxTotal: number
    total: number
    currency: string
    notes: string | null
    paidAt: string | null
    customer: {
      id: string
      name: string
      address: string | null
      vatId: string | null
      email: string | null
    }
    items: InvoiceItem[]
  }
}

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500",
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailProps) {
  const t = useTranslations("invoices")
  const tc = useTranslations("common")
  const router = useRouter()
  const locale = useLocale()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  function fmt(amount: number) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: invoice.currency || "EUR",
    }).format(amount)
  }

  function fmtDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  async function handleStatusChange(status: string) {
    const result = await updateInvoiceStatus(
      invoice.id,
      status as "sent" | "paid" | "overdue" | "cancelled"
    )
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("statusUpdated"))
    router.refresh()
  }

  async function handleDelete() {
    const result = await deleteInvoice(invoice.id)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("deleted"))
    router.push("/invoices")
  }

  async function handleCancel() {
    await handleStatusChange("cancelled")
    setCancelOpen(false)
  }

  const statusLabel: Record<string, string> = {
    draft: t("statusDraft"),
    sent: t("statusSent"),
    paid: t("statusPaid"),
    overdue: t("statusOverdue"),
    cancelled: t("statusCancelled"),
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Back link */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {invoice.number}
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "border font-medium",
                statusStyles[invoice.status as InvoiceStatus] ?? statusStyles.draft
              )}
            >
              {statusLabel[invoice.status] ?? invoice.status}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{invoice.customer.name}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <>
              <Button onClick={() => handleStatusChange("sent")} className="min-h-11 gap-1.5">
                <Send className="h-4 w-4" />
                {t("markSent")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="min-h-11 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                {tc("delete")}
              </Button>
            </>
          )}
          {invoice.status === "sent" && (
            <>
              <Button onClick={() => handleStatusChange("paid")} className="min-h-11 gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {t("markPaid")}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange("overdue")}
                className="min-h-11 gap-1.5"
              >
                <AlertCircle className="h-4 w-4" />
                {t("markOverdue")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setCancelOpen(true)}
                className="min-h-11 gap-1.5"
              >
                <Ban className="h-4 w-4" />
                {t("cancelInvoice")}
              </Button>
            </>
          )}
          {invoice.status === "overdue" && (
            <>
              <Button onClick={() => handleStatusChange("paid")} className="min-h-11 gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {t("markPaid")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setCancelOpen(true)}
                className="min-h-11 gap-1.5"
              >
                <Ban className="h-4 w-4" />
                {t("cancelInvoice")}
              </Button>
            </>
          )}
          {invoice.status === "paid" && invoice.paidAt && (
            <p className="text-sm text-muted-foreground self-center">
              {t("paidOn")}: {fmtDate(invoice.paidAt)}
            </p>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("customer")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">{invoice.customer.name}</p>
            {invoice.customer.address && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {invoice.customer.address}
              </p>
            )}
            {invoice.customer.email && (
              <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
            )}
            {invoice.customer.vatId && (
              <p className="text-sm text-muted-foreground">
                {t("vatId")}: {invoice.customer.vatId}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("invoiceDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("issueDate")}</span>
              <span>{fmtDate(invoice.issueDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("dueDate")}</span>
              <span>{fmtDate(invoice.dueDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("currency")}</span>
              <span>{invoice.currency}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line items table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("items")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: stacked */}
          <div className="md:hidden divide-y">
            {invoice.items.map((item) => (
              <div key={item.id} className="px-4 py-3 space-y-1">
                <p className="font-medium text-sm">{item.description}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {item.quantity} x {fmt(item.unitPrice)} ({item.taxRate}%)
                  </span>
                  <span className="font-medium text-foreground">{fmt(item.total)}</span>
                </div>
              </div>
            ))}
            {/* Mobile totals */}
            <div className="px-4 py-3 space-y-1 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span className="tabular-nums">{fmt(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("tax")}</span>
                <span className="tabular-nums">{fmt(invoice.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t">
                <span>{t("total")}</span>
                <span className="tabular-nums">{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead className="text-right w-20">{t("qty")}</TableHead>
                  <TableHead className="text-right w-28">{t("unitPrice")}</TableHead>
                  <TableHead className="text-right w-20">{t("taxPct")}</TableHead>
                  <TableHead className="text-right w-28">{t("lineTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(item.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.taxRate}%</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmt(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Desktop totals */}
            <div className="border-t px-4 py-3 space-y-1">
              <div className="flex justify-end gap-16 text-sm">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span className="tabular-nums w-28 text-right">{fmt(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-16 text-sm">
                <span className="text-muted-foreground">{t("tax")}</span>
                <span className="tabular-nums w-28 text-right">{fmt(invoice.taxTotal)}</span>
              </div>
              <div className="flex justify-end gap-16 text-base font-bold pt-1 border-t mt-1">
                <span>{t("total")}</span>
                <span className="tabular-nums w-28 text-right">{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={tc("delete")}
        description={t("deleteConfirm")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelInvoice")}
        description={t("cancelConfirm")}
        confirmLabel={t("cancelInvoice")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleCancel}
      />
    </div>
  )
}
