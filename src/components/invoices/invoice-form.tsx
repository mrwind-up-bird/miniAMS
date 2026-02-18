"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { TimeEntryPicker } from "@/components/invoices/time-entry-picker"
import { createInvoice, updateInvoice } from "@/lib/actions/invoices"

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
  notes: string | null
  customerId: string
  customer: { id: string; name: string }
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    total: number
  }>
}

interface InvoiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: { id: string; name: string }[]
  onSuccess?: () => void
  invoice?: Invoice
}

interface LineItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
  timeEntryId?: string
}

type FieldErrors = Record<string, string[] | undefined>

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK"]

function toDateInputValue(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10)
  return new Date(dateStr).toISOString().slice(0, 10)
}

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

function calcLineTotal(qty: string, price: string, tax: string): number {
  const q = parseFloat(qty) || 0
  const p = parseFloat(price) || 0
  const t = parseFloat(tax) || 0
  const subtotal = q * p
  return subtotal + subtotal * (t / 100)
}

function calcTotals(items: LineItem[]): {
  subtotal: number
  taxTotal: number
  total: number
} {
  let subtotal = 0
  let taxTotal = 0
  for (const item of items) {
    const q = parseFloat(item.quantity) || 0
    const p = parseFloat(item.unitPrice) || 0
    const t = parseFloat(item.taxRate) || 0
    const lineSubtotal = q * p
    const lineTax = lineSubtotal * (t / 100)
    subtotal += lineSubtotal
    taxTotal += lineTax
  }
  return { subtotal, taxTotal, total: subtotal + taxTotal }
}

function makeBlankItem(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    description: "",
    quantity: "1",
    unitPrice: "",
    taxRate: "0",
  }
}

export function InvoiceForm({
  open,
  onOpenChange,
  customers,
  onSuccess,
  invoice,
}: InvoiceFormProps) {
  const t = useTranslations("invoices")
  const tc = useTranslations("common")

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const [form, setForm] = useState({
    customerId: invoice?.customerId ?? invoice?.customer?.id ?? "",
    issueDate: toDateInputValue(invoice?.issueDate),
    dueDate: invoice?.dueDate ? toDateInputValue(invoice.dueDate) : defaultDueDate(),
    currency: invoice?.currency ?? "EUR",
    notes: invoice?.notes ?? "",
  })

  const [items, setItems] = useState<LineItem[]>(() => {
    if (invoice?.items && invoice.items.length > 0) {
      return invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        taxRate: item.taxRate.toString(),
      }))
    }
    return [makeBlankItem()]
  })

  // Sync when invoice prop changes
  useEffect(() => {
    setForm({
      customerId: invoice?.customerId ?? invoice?.customer?.id ?? "",
      issueDate: toDateInputValue(invoice?.issueDate),
      dueDate: invoice?.dueDate ? toDateInputValue(invoice.dueDate) : defaultDueDate(),
      currency: invoice?.currency ?? "EUR",
      notes: invoice?.notes ?? "",
    })
    setItems(
      invoice?.items && invoice.items.length > 0
        ? invoice.items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            taxRate: item.taxRate.toString(),
          }))
        : [makeBlankItem()]
    )
    setFieldErrors({})
    setStep(1)
  }, [invoice])

  function setFormField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function setItemField(id: string, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setItems((prev) => [...prev, makeBlankItem()])
  }

  function removeItem(id: string) {
    setItems((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }

  function handleImportTimeEntries(
    newItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      taxRate: number
      timeEntryId: string
    }>
  ) {
    const mapped: LineItem[] = newItems.map((entry) => ({
      id: Math.random().toString(36).slice(2),
      description: entry.description,
      quantity: entry.quantity.toString(),
      unitPrice: entry.unitPrice.toString(),
      taxRate: entry.taxRate.toString(),
      timeEntryId: entry.timeEntryId,
    }))
    setItems((prev) => {
      // Remove blank placeholder items
      const nonEmpty = prev.filter(
        (i) => i.description.trim() !== "" || i.unitPrice.trim() !== ""
      )
      return [...nonEmpty, ...mapped]
    })
    setShowTimePicker(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (!form.customerId) {
        setFieldErrors({ customerId: ["Customer is required"] })
        return
      }
      setStep(2)
      return
    }

    setLoading(true)
    setFieldErrors({})

    const parsedItems = items
      .filter((item) => item.description.trim() !== "")
      .map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        taxRate: parseFloat(item.taxRate) || 0,
        timeEntryId: item.timeEntryId,
      }))

    if (parsedItems.length === 0) {
      setFieldErrors({ items: ["At least one line item is required"] })
      setLoading(false)
      return
    }

    const { subtotal, taxTotal, total } = calcTotals(items)

    const data = {
      customerId: form.customerId,
      issueDate: new Date(form.issueDate),
      dueDate: new Date(form.dueDate),
      currency: form.currency,
      notes: form.notes || undefined,
      subtotal,
      taxTotal,
      total,
      items: parsedItems,
    }

    try {
      const result = invoice
        ? await updateInvoice(invoice.id, data)
        : await createInvoice(data)

      if (result && "error" in result) {
        if (typeof result.error === "object" && result.error !== null) {
          setFieldErrors(result.error as FieldErrors)
        } else {
          toast.error(String(result.error))
        }
        return
      }

      toast.success(t("saved"))
      onOpenChange(false)
      onSuccess?.()
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!loading) {
      onOpenChange(open)
      if (!open) {
        setFieldErrors({})
        setStep(1)
        setShowTimePicker(false)
        if (!invoice) {
          setForm({
            customerId: "",
            issueDate: new Date().toISOString().slice(0, 10),
            dueDate: defaultDueDate(),
            currency: "EUR",
            notes: "",
          })
          setItems([makeBlankItem()])
        }
      }
    }
  }

  const totals = calcTotals(items)

  const selectedCustomerName =
    customers.find((c) => c.id === form.customerId)?.name ?? ""

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col h-full"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>
            {invoice ? tc("edit") : tc("create")} {t("invoice")}
          </SheetTitle>
          {step === 2 && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCustomerName} — {t("addLineItems")}
            </p>
          )}
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Step 1: Invoice details */}
            {step === 1 && (
              <>
                {/* Customer */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-customer">{t("customer")} *</Label>
                  <Select
                    value={form.customerId}
                    onValueChange={(v) => setFormField("customerId", v)}
                  >
                    <SelectTrigger
                      id="inv-customer"
                      className={`h-11 w-full ${fieldErrors.customerId ? "border-destructive" : ""}`}
                    >
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.customerId && (
                    <p className="text-xs text-destructive">{fieldErrors.customerId[0]}</p>
                  )}
                </div>

                {/* Issue date + Due date row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-issue-date">{t("issueDate")}</Label>
                    <Input
                      id="inv-issue-date"
                      type="date"
                      value={form.issueDate}
                      onChange={(e) => setFormField("issueDate", e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-due-date">{t("dueDate")} *</Label>
                    <Input
                      id="inv-due-date"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setFormField("dueDate", e.target.value)}
                      required
                      className="h-11"
                    />
                    {fieldErrors.dueDate && (
                      <p className="text-xs text-destructive">{fieldErrors.dueDate[0]}</p>
                    )}
                  </div>
                </div>

                {/* Currency */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-currency">{t("currency")}</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setFormField("currency", v)}
                  >
                    <SelectTrigger id="inv-currency" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-notes">{t("notes")}</Label>
                  <Textarea
                    id="inv-notes"
                    value={form.notes}
                    onChange={(e) => setFormField("notes", e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder={t("notesPlaceholder")}
                  />
                </div>
              </>
            )}

            {/* Step 2: Line items */}
            {step === 2 && (
              <>
                {/* Import from time entries */}
                {form.customerId && (
                  <div>
                    {showTimePicker ? (
                      <TimeEntryPicker
                        customerId={form.customerId}
                        onImport={handleImportTimeEntries}
                        onClose={() => setShowTimePicker(false)}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full min-h-11 gap-2"
                        onClick={() => setShowTimePicker(true)}
                      >
                        <Clock className="h-4 w-4" />
                        {t("importFromTimeEntries")}
                      </Button>
                    )}
                  </div>
                )}

                {!showTimePicker && (
                  <>
                    <Separator />

                    {/* Line items header */}
                    <div className="grid grid-cols-[1fr_64px_80px_56px_32px] gap-1.5 items-center text-xs font-medium text-muted-foreground px-0.5">
                      <span>{t("description")}</span>
                      <span className="text-right">{t("qty")}</span>
                      <span className="text-right">{t("unitPrice")}</span>
                      <span className="text-right">{t("taxPct")}</span>
                      <span />
                    </div>

                    {/* Line items */}
                    <div className="space-y-2">
                      {items.map((item) => {
                        const lineTotal = calcLineTotal(
                          item.quantity,
                          item.unitPrice,
                          item.taxRate
                        )
                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="grid grid-cols-[1fr_64px_80px_56px_32px] gap-1.5 items-center">
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  setItemField(item.id, "description", e.target.value)
                                }
                                placeholder={t("itemDescription")}
                                className="h-9 text-sm"
                              />
                              <Input
                                value={item.quantity}
                                onChange={(e) =>
                                  setItemField(item.id, "quantity", e.target.value)
                                }
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-9 text-sm text-right px-2"
                              />
                              <Input
                                value={item.unitPrice}
                                onChange={(e) =>
                                  setItemField(item.id, "unitPrice", e.target.value)
                                }
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="h-9 text-sm text-right px-2"
                              />
                              <Input
                                value={item.taxRate}
                                onChange={(e) =>
                                  setItemField(item.id, "taxRate", e.target.value)
                                }
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="h-9 text-sm text-right px-2"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                aria-label="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {lineTotal > 0 && (
                              <p className="text-xs text-muted-foreground text-right pr-9">
                                ={" "}
                                {new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: form.currency,
                                }).format(lineTotal)}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {fieldErrors.items && (
                      <p className="text-xs text-destructive">{fieldErrors.items[0]}</p>
                    )}

                    {/* Add item button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 min-h-9"
                      onClick={addItem}
                    >
                      <Plus className="h-4 w-4" />
                      {t("addItem")}
                    </Button>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("subtotal")}</span>
                        <span className="tabular-nums font-medium">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: form.currency,
                          }).format(totals.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("tax")}</span>
                        <span className="tabular-nums font-medium">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: form.currency,
                          }).format(totals.taxTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span className="font-semibold">{t("total")}</span>
                        <span className="tabular-nums font-bold text-base">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: form.currency,
                          }).format(totals.total)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t gap-2">
            {step === 2 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 min-h-11"
                >
                  {t("back")}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || showTimePicker}
                  className="flex-1 min-h-11"
                >
                  {loading ? tc("loading") : tc("save")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                  className="flex-1 min-h-11"
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!form.customerId}
                  className="flex-1 min-h-11"
                >
                  {t("nextStep")}
                </Button>
              </>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
