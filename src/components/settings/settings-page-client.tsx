"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { User, Building2, Users, Shield, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  updateProfile,
  changePassword,
  updateCompanySettings,
  updateMemberRole,
  removeMember,
} from "@/lib/actions/settings"

interface Profile {
  id: string
  name: string
  email: string
  locale: string
  role: string
}

interface Company {
  id: string
  name: string
  slug: string
  plan: string
}

interface Member {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date | string
}

interface SettingsPageClientProps {
  profile: Profile
  company: Company
  members: Member[]
  currentUserId: string
  currentUserRole: string
}

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  member: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  viewer: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
}

export function SettingsPageClient({
  profile,
  company,
  members,
  currentUserId,
  currentUserRole,
}: SettingsPageClientProps) {
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const router = useRouter()

  // Profile state
  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    email: profile.email,
    locale: profile.locale,
  })
  const [profileLoading, setProfileLoading] = useState(false)

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Company state
  const [companyForm, setCompanyForm] = useState({
    name: company.name,
    slug: company.slug,
  })
  const [companyLoading, setCompanyLoading] = useState(false)

  // Team state
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null)

  const isOwner = currentUserRole === "owner"
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin"

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    const result = await updateProfile(profileForm)
    setProfileLoading(false)
    if (result && "error" in result) {
      toast.error(typeof result.error === "string" ? result.error : t("error"))
      return
    }
    toast.success(t("profileSaved"))
    router.refresh()
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordLoading(true)
    const result = await changePassword(passwordForm)
    setPasswordLoading(false)
    if (result && "error" in result) {
      toast.error(typeof result.error === "string" ? result.error : t("error"))
      return
    }
    toast.success(t("passwordChanged"))
    setPasswordForm({ currentPassword: "", newPassword: "" })
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault()
    setCompanyLoading(true)
    const result = await updateCompanySettings(companyForm)
    setCompanyLoading(false)
    if (result && "error" in result) {
      toast.error(typeof result.error === "string" ? result.error : t("error"))
      return
    }
    toast.success(t("companySaved"))
    router.refresh()
  }

  async function handleRoleChange(userId: string, role: string) {
    const result = await updateMemberRole({ userId, role })
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("roleUpdated"))
    router.refresh()
  }

  async function handleRemoveMember() {
    if (!deleteConfirm) return
    const result = await removeMember(deleteConfirm.id)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("memberRemoved"))
    setDeleteConfirm(null)
    router.refresh()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-1.5 min-h-9">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5 min-h-9">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("company")}</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 min-h-9">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t("team")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("profileInfo")}</CardTitle>
              <CardDescription>{t("profileInfoDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">{t("name")}</Label>
                    <Input
                      id="profile-name"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">{t("email")}</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, email: e.target.value }))
                      }
                      required
                      className="min-h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-locale">{t("language")}</Label>
                  <Select
                    value={profileForm.locale}
                    onValueChange={(v) =>
                      setProfileForm((p) => ({ ...p, locale: v }))
                    }
                  >
                    <SelectTrigger id="profile-locale" className="min-h-11 w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={profileLoading} className="min-h-11">
                  {profileLoading ? "..." : tc("save")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("changePassword")}</CardTitle>
              <CardDescription>{t("changePasswordDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">{t("currentPassword")}</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                      }
                      required
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("newPassword")}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                      }
                      required
                      minLength={8}
                      className="min-h-11"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t("passwordRequirements")}</p>
                <Button type="submit" disabled={passwordLoading} className="min-h-11">
                  {passwordLoading ? "..." : t("changePassword")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("companyInfo")}</CardTitle>
              <CardDescription>{t("companyInfoDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">{t("companyName")}</Label>
                    <Input
                      id="company-name"
                      value={companyForm.name}
                      onChange={(e) =>
                        setCompanyForm((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                      className="min-h-11"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-slug">{t("companySlug")}</Label>
                    <Input
                      id="company-slug"
                      value={companyForm.slug}
                      onChange={(e) =>
                        setCompanyForm((p) => ({
                          ...p,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        }))
                      }
                      required
                      className="min-h-11"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{t("plan")}: {company.plan}</Badge>
                </div>
                {isAdmin && (
                  <Button type="submit" disabled={companyLoading} className="min-h-11">
                    {companyLoading ? "..." : tc("save")}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("teamMembers")}</CardTitle>
              <CardDescription>{t("teamMembersDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {member.id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">
                            {t("you")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && member.id !== currentUserId ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleRoleChange(member.id, v)}
                          >
                            <SelectTrigger className="w-28 min-h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                              <SelectItem value="member">{t("roleMember")}</SelectItem>
                              <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge
                          variant="outline"
                          className={roleColors[member.role] ?? roleColors.member}
                        >
                          {t(`role${member.role.charAt(0).toUpperCase()}${member.role.slice(1)}` as "roleOwner")}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={t("removeMember")}
        description={t("removeMemberConfirm", { name: deleteConfirm?.name ?? "" })}
        confirmLabel={t("removeMember")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleRemoveMember}
      />
    </div>
  )
}
