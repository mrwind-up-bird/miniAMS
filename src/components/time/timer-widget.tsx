"use client"

import { useEffect, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Play, Square, Timer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { startTimer, stopTimer } from "@/lib/actions/time-entries"
import { getProjects } from "@/lib/actions/projects"

interface Project {
  id: string
  name: string
}

interface RunningEntry {
  id: string
  startTime: Date | string | null
  description: string | null
  project: { id: string; name: string }
}

interface TimerWidgetProps {
  runningEntry?: RunningEntry | null
  projects?: Project[]
}

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function TimerWidget({ runningEntry: initialRunning, projects: initialProjects }: TimerWidgetProps) {
  const t = useTranslations("time")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [running, setRunning] = useState<RunningEntry | null>(initialRunning ?? null)
  const [elapsed, setElapsed] = useState(0)
  const [projects, setProjects] = useState<Project[]>(initialProjects ?? [])

  // Form state for starting a new timer
  const [projectId, setProjectId] = useState("")
  const [description, setDescription] = useState("")
  const [billable, setBillable] = useState(true)

  // Load projects if not provided
  useEffect(() => {
    if (initialProjects) return
    getProjects({ pageSize: 100 }).then(({ projects }) => setProjects(projects))
  }, [initialProjects])

  // Tick the elapsed timer when running
  useEffect(() => {
    if (!running?.startTime) {
      setElapsed(0)
      return
    }
    const startMs = new Date(running.startTime).getTime()
    function tick() {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [running])

  function handleStart() {
    if (!projectId) return
    startTransition(async () => {
      const result = await startTimer({ projectId, description: description || undefined })
      if (result && "error" in result) {
        toast.error(String(result.error))
        return
      }
      setRunning(result as RunningEntry)
      setDescription("")
      toast.success(t("timerStarted"))
      router.refresh()
    })
  }

  function handleStop() {
    if (!running) return
    startTransition(async () => {
      const result = await stopTimer(running.id)
      if (result && "error" in result) {
        toast.error(String(result.error))
        return
      }
      setRunning(null)
      setProjectId("")
      toast.success(t("timerStopped"))
      router.refresh()
    })
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        {/* Elapsed display */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Timer className="h-4 w-4" />
            {running ? (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {t("running")}
              </span>
            ) : (
              <span className="text-sm">{t("timer")}</span>
            )}
          </div>
          <span
            className={`text-5xl font-mono font-bold tabular-nums tracking-tight transition-colors ${
              running ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            }`}
          >
            {formatElapsed(elapsed)}
          </span>
          {running && (
            <p className="text-sm text-muted-foreground font-medium">
              {running.project.name}
              {running.description ? ` — ${running.description}` : ""}
            </p>
          )}
        </div>

        {/* Form (hidden while running) */}
        {!running && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="timer-project">{t("project")} *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="timer-project" className="h-11 w-full">
                  <SelectValue placeholder={t("noProject")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timer-description">{t("description")}</Label>
              <Input
                id="timer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("description")}
                className="h-11"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="timer-billable"
                checked={billable}
                onCheckedChange={(v) => setBillable(v === true)}
              />
              <Label htmlFor="timer-billable" className="cursor-pointer">
                {t("billable")}
              </Label>
            </div>
          </div>
        )}

        {/* Start / Stop button */}
        {running ? (
          <Button
            onClick={handleStop}
            disabled={isPending}
            size="lg"
            className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
          >
            <Square className="mr-2 h-5 w-5 fill-current" />
            {t("stopTimer")}
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isPending || !projectId}
            size="lg"
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="mr-2 h-5 w-5 fill-current" />
            {t("startTimer")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
