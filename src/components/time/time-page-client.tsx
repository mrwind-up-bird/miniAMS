"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { TimerWidget } from "@/components/time/timer-widget"
import { TimeEntryList } from "@/components/time/time-entry-list"
import { TimeEntryForm } from "@/components/time/time-entry-form"
import { WeeklyView } from "@/components/time/weekly-view"

interface Project {
  id: string
  name: string
}

interface TimeEntry {
  id: string
  projectId: string
  description: string | null
  startTime: Date | string | null
  endTime: Date | string | null
  duration: number
  billable: boolean
  status: string
  tags: string[]
  project: { id: string; name: string }
  createdAt: Date | string
}

interface RunningEntry {
  id: string
  startTime: Date | string | null
  description: string | null
  project: { id: string; name: string }
}

interface WeeklyData {
  projects: {
    projectId: string
    projectName: string
    days: Record<number, number>
    total: number
  }[]
  grandTotal: number
  weekStart: string
  weekEnd: string
}

interface TimePageClientProps {
  entries: TimeEntry[]
  total: number
  runningEntry: RunningEntry | null
  projects: Project[]
  weeklyData: WeeklyData
}

export function TimePageClient({
  entries,
  runningEntry,
  projects,
  weeklyData,
}: TimePageClientProps) {
  const t = useTranslations("time")
  const router = useRouter()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>()

  function openCreate() {
    setEditingEntry(undefined)
    setSheetOpen(true)
  }

  function openEdit(entry: TimeEntry) {
    setEditingEntry(entry)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="space-y-4 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <Button onClick={openCreate} className="min-h-11 shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            {t("addEntry")}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="timer">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="timer" className="flex-1 md:flex-none">
              {t("timer")}
            </TabsTrigger>
            <TabsTrigger value="entries" className="flex-1 md:flex-none">
              {t("entriesList")}
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1 md:flex-none">
              {t("weeklyView")}
            </TabsTrigger>
          </TabsList>

          {/* Timer tab */}
          <TabsContent value="timer" className="mt-4">
            <TimerWidget runningEntry={runningEntry} projects={projects} />
          </TabsContent>

          {/* Entries tab */}
          <TabsContent value="entries" className="mt-4 space-y-4">
            {entries.length === 0 ? (
              <EmptyState
                icon={Clock}
                title={t("empty")}
                description={t("emptyDescription")}
                action={
                  <Button onClick={openCreate} className="min-h-11">
                    {t("addEntry")}
                  </Button>
                }
              />
            ) : (
              <TimeEntryList entries={entries} onEdit={openEdit} />
            )}
          </TabsContent>

          {/* Weekly tab */}
          <TabsContent value="weekly" className="mt-4">
            <WeeklyView initialData={weeklyData} />
          </TabsContent>
        </Tabs>
      </div>

      <TimeEntryForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        entry={editingEntry}
        projects={projects}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
