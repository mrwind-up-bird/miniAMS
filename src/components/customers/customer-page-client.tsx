"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomerList } from "@/components/customers/customer-list"
import { CustomerForm } from "@/components/customers/customer-form"
import { SearchBar } from "@/components/shared/search-bar"
import { EmptyState } from "@/components/shared/empty-state"

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  tags: string[]
  address: string | null
  vatId: string | null
  paymentTermDays: number | null
  currency: string | null
  _count?: { projects: number }
}

interface CustomerPageClientProps {
  customers: Customer[]
  total: number
  canDelete?: boolean
}

export function CustomerPageClient({ customers, total, canDelete = false }: CustomerPageClientProps) {
  const t = useTranslations("customers")
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>()

  function openCreate() {
    setEditingCustomer(undefined)
    setSheetOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    setSheetOpen(true)
  }

  function handleSuccess() {
    router.refresh()
  }

  return (
    <>
      <div className="space-y-4 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <Button onClick={openCreate} className="min-h-11 shrink-0">
            {t("addCustomer")}
          </Button>
        </div>

        {/* Search */}
        <SearchBar placeholder={t("title")} paramName="search" />

        {/* List or empty state */}
        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("empty")}
            description={t("emptyDescription")}
            action={
              <Button onClick={openCreate} className="min-h-11">
                {t("addCustomer")}
              </Button>
            }
          />
        ) : (
          <CustomerList
            customers={customers}
            onEdit={openEdit}
            canDelete={canDelete}
          />
        )}
      </div>

      <CustomerForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customer={editingCustomer}
        onSuccess={handleSuccess}
      />
    </>
  )
}
