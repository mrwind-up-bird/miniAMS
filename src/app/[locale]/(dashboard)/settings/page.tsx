import { getProfile, getCompanySettings, getTeamMembers } from "@/lib/actions/settings"
import { requireAuth } from "@/lib/tenant"
import { SettingsPageClient } from "@/components/settings/settings-page-client"

export default async function SettingsPage() {
  const session = await requireAuth()
  const [profile, company, members] = await Promise.all([
    getProfile(),
    getCompanySettings(),
    getTeamMembers(),
  ])

  if ("error" in profile || "error" in company) {
    return <div>Error loading settings</div>
  }

  return (
    <SettingsPageClient
      profile={profile}
      company={company}
      members={members}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  )
}
