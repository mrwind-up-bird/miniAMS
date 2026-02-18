"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
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
import { createCustomer, updateCustomer } from "@/lib/actions/customers"

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  vatId: string | null
  paymentTermDays: number | null
  currency: string | null
  status: string
  tags: string[]
}

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  onSuccess?: () => void
}

type FieldErrors = Record<string, string[] | undefined>

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK"]
const STATUSES = [
  { value: "lead", labelKey: "statusLead" },
  { value: "active", labelKey: "statusActive" },
  { value: "on_hold", labelKey: "statusOnHold" },
  { value: "churned", labelKey: "statusChurned" },
] as const

export function CustomerForm({ open, onOpenChange, customer, onSuccess }: CustomerFormProps) {
  const t = useTranslations("customers")
  const tc = useTranslations("common")

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [form, setForm] = useState({
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    vatId: customer?.vatId ?? "",
    paymentTermDays: customer?.paymentTermDays?.toString() ?? "30",
    currency: customer?.currency ?? "EUR",
    status: customer?.status ?? "lead",
    tags: customer?.tags?.join(", ") ?? "",
  })

  // Sync form when customer prop changes (e.g. switching between edit targets)
  useEffect(() => {
    setForm({
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      vatId: customer?.vatId ?? "",
      paymentTermDays: customer?.paymentTermDays?.toString() ?? "30",
      currency: customer?.currency ?? "EUR",
      status: customer?.status ?? "lead",
      tags: customer?.tags?.join(", ") ?? "",
    })
    setFieldErrors({})
  }, [customer])

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    const data = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      vatId: form.vatId || undefined,
      paymentTermDays: form.paymentTermDays ? parseInt(form.paymentTermDays, 10) : undefined,
      currency: form.currency || undefined,
      status: form.status || undefined,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    }

    try {
      const result = customer
        ? await updateCustomer(customer.id, data)
        : await createCustomer(data)

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
        if (!customer) {
          setForm({
            name: "",
            email: "",
            phone: "",
            address: "",
            vatId: "",
            paymentTermDays: "30",
            currency: "EUR",
            status: "lead",
            tags: "",
          })
        }
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col h-full"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>
            {customer ? tc("edit") : tc("create")} {t("title").replace(/s$/, "")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("name")} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                aria-invalid={!!fieldErrors.name}
                className="h-11"
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                aria-invalid={!!fieldErrors.email}
                className="h-11"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="h-11"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">{t("address")}</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* VAT ID */}
            <div className="space-y-1.5">
              <Label htmlFor="vatId">{t("vatId")}</Label>
              <Input
                id="vatId"
                value={form.vatId}
                onChange={(e) => set("vatId", e.target.value)}
                className="h-11"
              />
            </div>

            {/* Payment Terms + Currency row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paymentTermDays">{t("paymentTerms")}</Label>
                <div className="relative">
                  <Input
                    id="paymentTermDays"
                    type="number"
                    min={1}
                    max={365}
                    value={form.paymentTermDays}
                    onChange={(e) => set("paymentTermDays", e.target.value)}
                    className="h-11 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    {t("days")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">{t("currency")}</Label>
                <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger id="currency" className="h-11 w-full">
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
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status">{t("status")}</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger id="status" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="tags">{t("tags")}</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="e.g. agency, enterprise"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t gap-2">
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
              disabled={loading}
              className="flex-1 min-h-11"
            >
              {loading ? tc("loading") : tc("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
