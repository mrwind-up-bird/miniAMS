"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

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

interface CustomerInfoTabProps {
  customer: Customer
}

interface InfoRowProps {
  label: string
  value: string | null | undefined
}

function InfoRow({ label, value }: InfoRowProps) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 items-baseline text-sm">
      <span className="text-muted-foreground font-medium shrink-0">{label}</span>
      <span className="break-words">{value}</span>
    </div>
  )
}

export function CustomerInfoTab({ customer }: CustomerInfoTabProps) {
  const t = useTranslations("customers")

  const hasContactInfo = customer.email || customer.phone || customer.address
  const hasBillingInfo = customer.vatId || customer.paymentTermDays || customer.currency

  return (
    <div className="space-y-4">
      {/* Contact info */}
      {hasContactInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("contacts")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 divide-y">
            <InfoRow label={t("email")} value={customer.email} />
            <InfoRow label={t("phone")} value={customer.phone} />
            <InfoRow label={t("address")} value={customer.address} />
          </CardContent>
        </Card>
      )}

      {/* Billing info */}
      {hasBillingInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 divide-y">
            <InfoRow label={t("vatId")} value={customer.vatId} />
            <InfoRow
              label={t("paymentTerms")}
              value={
                customer.paymentTermDays
                  ? `${customer.paymentTermDays} ${t("days")}`
                  : null
              }
            />
            <InfoRow label={t("currency")} value={customer.currency} />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasContactInfo && !hasBillingInfo && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      )}
    </div>
  )
}
