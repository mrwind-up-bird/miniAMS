"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import {
  createContact,
  updateContact,
  deleteContact,
} from "@/lib/actions/contacts"

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

interface ContactsTabProps {
  customerId: string
  contacts: Contact[]
}

export function ContactsTab({ customerId, contacts }: ContactsTabProps) {
  const t = useTranslations("contacts")
  const tc = useTranslations("common")
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(false)

  function handleEdit(contact: Contact) {
    setEditing(contact)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      role: (formData.get("role") as string) || undefined,
      isPrimary: formData.get("isPrimary") === "on",
      customerId,
    }

    const result = editing
      ? await updateContact(editing.id, data)
      : await createContact(data)

    setLoading(false)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("saved"))
    setFormOpen(false)
    setEditing(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleting) return
    const result = await deleteContact(deleting.id)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("deleted"))
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  if (contacts.length === 0 && !formOpen) {
    return (
      <EmptyState
        title={t("empty")}
        action={
          <Button onClick={handleAdd} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addContact")}
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={handleAdd} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addContact")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {contact.name}
                      </span>
                      {contact.isPrimary && (
                        <Badge variant="secondary" className="shrink-0 gap-1">
                          <Star className="h-3 w-3" />
                          {t("primary")}
                        </Badge>
                      )}
                    </div>
                    {contact.role && (
                      <p className="text-sm text-muted-foreground">
                        {contact.role}
                      </p>
                    )}
                    {contact.email && (
                      <p className="mt-1 text-sm truncate">{contact.email}</p>
                    )}
                    {contact.phone && (
                      <p className="text-sm text-muted-foreground">
                        {contact.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleEdit(contact)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleting(contact)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing ? tc("edit") : t("addContact")}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">{t("name")}</Label>
              <Input
                id="contact-name"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">{t("email")}</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                defaultValue={editing?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">{t("phone")}</Label>
              <Input
                id="contact-phone"
                name="phone"
                defaultValue={editing?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">{t("role")}</Label>
              <Input
                id="contact-role"
                name="role"
                defaultValue={editing?.role ?? ""}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="contact-primary"
                name="isPrimary"
                defaultChecked={editing?.isPrimary ?? false}
              />
              <Label htmlFor="contact-primary">{t("primary")}</Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : tc("save")}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={tc("delete")}
        description={t("deleted")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
