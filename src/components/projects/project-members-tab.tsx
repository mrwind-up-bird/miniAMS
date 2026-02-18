"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { UserPlus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { addProjectMember, removeProjectMember } from "@/lib/actions/projects"
import { getUsers } from "@/lib/actions/users"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Member {
  id: string
  role: string
  hourlyRate: number | null
  user: { id: string; name: string; email: string; role: string }
}

interface ProjectMembersTabProps {
  projectId: string
  members: Member[]
}

export function ProjectMembersTab({ projectId, members: initialMembers }: ProjectMembersTabProps) {
  const t = useTranslations("projects")
  const tc = useTranslations("common")

  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [removeUserId, setRemoveUserId] = useState<string | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [addForm, setAddForm] = useState({ userId: "", role: "member", hourlyRate: "" })
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    if (sheetOpen) {
      getUsers().then(setUsers)
    }
  }, [sheetOpen])

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.userId) return
    setAddLoading(true)

    const data = {
      userId: addForm.userId,
      role: addForm.role || "member",
      hourlyRate: addForm.hourlyRate ? parseFloat(addForm.hourlyRate) : undefined,
    }

    try {
      const result = await addProjectMember(projectId, data)
      if (result && "error" in result) {
        toast.error(String(result.error))
        return
      }
      toast.success(t("memberSaved"))
      setSheetOpen(false)
      setAddForm({ userId: "", role: "member", hourlyRate: "" })
      const user = users.find((u) => u.id === data.userId)
      if (user && result && "id" in result) {
        const newMember: Member = {
          id: (result as { id: string }).id,
          role: data.role,
          hourlyRate: data.hourlyRate ?? null,
          user,
        }
        setMembers((prev) => {
          const existing = prev.find((m) => m.user.id === user.id)
          if (existing) {
            return prev.map((m) => (m.user.id === user.id ? newMember : m))
          }
          return [...prev, newMember]
        })
      }
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRemoveMember() {
    if (!removeUserId) return
    const result = await removeProjectMember(projectId, removeUserId)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("memberRemoved"))
    setMembers((prev) => prev.filter((m) => m.user.id !== removeUserId))
  }

  const availableUsers = users.filter((u) => !members.some((m) => m.user.id === u.id))

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {members.length} {t("members")}
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="min-h-11 gap-2"
            onClick={() => setSheetOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            {t("addMember")}
          </Button>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("noMembers")}
            description={t("noMembersDescription")}
            action={
              <Button
                variant="outline"
                className="min-h-11 gap-2"
                onClick={() => setSheetOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                {t("addMember")}
              </Button>
            }
          />
        ) : (
          <div className="rounded-xl border bg-card shadow-sm divide-y">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {member.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.user.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                      {member.hourlyRate != null && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            €{Number(member.hourlyRate)}/h
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setRemoveUserId(member.user.id)}
                  aria-label={t("removeMember")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add member sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>{t("addMember")}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleAddMember} className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex-1 px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="userId">{t("selectUser")} *</Label>
                <Select
                  value={addForm.userId}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, userId: v }))}
                >
                  <SelectTrigger id="userId" className="h-11 w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        {tc("noResults")}
                      </SelectItem>
                    ) : (
                      availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="memberRole">{t("role")}</Label>
                <Input
                  id="memberRole"
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="member"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="memberRate">{t("hourlyRate")}</Label>
                <Input
                  id="memberRate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={addForm.hourlyRate}
                  onChange={(e) => setAddForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={addLoading}
                className="flex-1 min-h-11"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={addLoading || !addForm.userId}
                className="flex-1 min-h-11"
              >
                {addLoading ? tc("loading") : tc("save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={removeUserId !== null}
        onOpenChange={(open) => { if (!open) setRemoveUserId(null) }}
        title={t("removeMemberConfirm")}
        description={t("removeMemberDescription")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleRemoveMember}
      />
    </>
  )
}
