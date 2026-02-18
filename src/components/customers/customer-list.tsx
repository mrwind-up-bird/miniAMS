"use client"

import { useTranslations } from "next-intl"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Link } from "@/i18n/navigation"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { deleteCustomer } from "@/lib/actions/customers"

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

interface CustomerListProps {
  customers: Customer[]
  onEdit?: (customer: Customer) => void
  canDelete?: boolean
}

function statusLabel(status: string, t: ReturnType<typeof useTranslations>) {
  const map: Record<string, string> = {
    lead: t("statusLead"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    churned: t("statusChurned"),
  }
  return map[status] ?? status
}

export function CustomerList({ customers, onEdit, canDelete = false }: CustomerListProps) {
  const t = useTranslations("customers")
  const tc = useTranslations("common")
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteCustomer(deleteId)
    if (result && "error" in result) {
      toast.error(String(result.error))
    } else {
      toast.success(t("deleted"))
      router.refresh()
    }
  }

  if (customers.length === 0) return null

  return (
    <>
      {/* Mobile card grid */}
      <div className="grid gap-3 md:hidden pb-20">
        {customers.map((customer) => (
          <Link
            key={customer.id}
            href={`/customers/${customer.id}`}
            className="block"
          >
            <div className="rounded-xl border bg-card shadow-sm p-4 min-h-[88px] flex flex-col gap-2 active:opacity-70 transition-opacity">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-base leading-tight">{customer.name}</span>
                <StatusBadge
                  status={customer.status}
                  type="customer"
                  label={statusLabel(customer.status, t)}
                />
              </div>
              {customer.email && (
                <span className="text-sm text-muted-foreground truncate">{customer.email}</span>
              )}
              {customer.phone && (
                <span className="text-sm text-muted-foreground">{customer.phone}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("projects")}</TableHead>
              <TableHead className="w-12">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium hover:underline underline-offset-4"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={customer.status}
                    type="customer"
                    label={statusLabel(customer.status, t)}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.email ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.phone ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer._count?.projects ?? 0}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={tc("actions")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit?.(customer)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        {tc("edit")}
                      </DropdownMenuItem>
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(customer.id)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            {tc("delete")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
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
