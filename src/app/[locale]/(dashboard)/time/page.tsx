import { getTimeEntries, getRunningTimer, getWeeklyOverview } from "@/lib/actions/time-entries"
import { getProjects } from "@/lib/actions/projects"
import { getWeekStart } from "@/lib/format"
import { TimePageClient } from "@/components/time/time-page-client"

export default async function TimePage() {
  const weekStart = getWeekStart(new Date()).toISOString().slice(0, 10)

  const [{ entries, total }, runningEntry, { projects }, weeklyData] = await Promise.all([
    getTimeEntries({ pageSize: 50 }),
    getRunningTimer(),
    getProjects({ pageSize: 100, status: "active" }),
    getWeeklyOverview(weekStart),
  ])

  return (
    <TimePageClient
      entries={entries}
      total={total}
      runningEntry={runningEntry}
      projects={projects}
      weeklyData={weeklyData}
    />
  )
}
