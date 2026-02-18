"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CustomerForm } from "@/components/customers/customer-form"
import { ContactsTab } from "@/components/customers/contacts-tab"
import { CustomerProjectsTab } from "@/components/customers/customer-projects-tab"
import { CustomerInfoTab } from "@/components/customers/customer-info-tab"
import { deleteCustomer } from "@/lib/actions/customers"

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

interface Project {
  id: string
  name: string
  status: string
  type: string
  budget: number | null
  startDate: Date | null
  endDate: Date | null
}

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
  contacts: Contact[]
  _count: { projects: number }
}

interface CustomerDetailClientProps {
  customer: Customer
  projects: Project[]
  userRole: string
}

export function CustomerDetailClient({ customer, projects, userRole }: CustomerDetailClientProps) {
  const t = useTranslations("customers")
  const tc = useTranslations("common")
  const router = useRouter()
  const canDelete = userRole === "owner" || userRole === "admin"

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const statusLabelMap: Record<string, string> = {
    lead: t("statusLead"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    churned: t("statusChurned"),
  }

  async function handleDelete() {
    const result = await deleteCustomer(customer.id)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("deleted"))
    router.push("/customers")
  }

  return (
    <>
      <div className="space-y-4 pb-20 md:pb-6">
        {/* Back link */}
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("back")}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <StatusBadge
              status={customer.status}
              type="customer"
              label={statusLabelMap[customer.status] ?? customer.status}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={() => setEditOpen(true)}
              aria-label={tc("edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
                aria-label={tc("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        {customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="info" className="min-w-fit">
              {t("info")}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="min-w-fit">
              {t("contacts")}
              {customer.contacts.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {customer.contacts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects" className="min-w-fit">
              {t("projects")}
              {projects.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {projects.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="min-w-fit">
              {t("activity")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <CustomerInfoTab customer={customer} />
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <ContactsTab
              customerId={customer.id}
              contacts={customer.contacts}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <CustomerProjectsTab
              customerId={customer.id}
              projects={projects}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">Activity log coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CustomerForm
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirm")}
        description={t("deleteDescription")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
