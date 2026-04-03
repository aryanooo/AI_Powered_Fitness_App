import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, MoreHorizontal, Pencil, Sparkles, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Markdown } from "@/components/Common/Markdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { fitnessApi } from "@/lib/fitness-api"

function formatDate(value?: string | null) {
  if (!value) {
    return "Just now"
  }
  return new Date(value).toLocaleDateString()
}

export default function PlanWorkspace() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const [planNotes, setPlanNotes] = useState("")
  const [includeWorkoutContext, setIncludeWorkoutContext] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [renamingPlanId, setRenamingPlanId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const { data: profile } = useQuery({
    queryKey: ["fitness-profile"],
    queryFn: fitnessApi.getProfile,
  })
  const { data: plans } = useQuery({
    queryKey: ["fitness-plans"],
    queryFn: fitnessApi.getPlans,
  })

  const recentPlans = plans?.data ?? []
  const latestWorkoutPlan = useMemo(
    () => recentPlans.find((plan) => plan.plan_type === "workout") || null,
    [recentPlans]
  )
  const hasWorkoutPlan = Boolean(latestWorkoutPlan)

  const planMutation = useMutation({
    mutationFn: (payload: {
      plan_type: string
      notes?: string
      include_workout_context?: boolean
    }) =>
      fitnessApi.generatePlan({
        plan_type: payload.plan_type,
        goal_override: profile?.goal || undefined,
        notes: payload.notes,
        include_workout_context: payload.include_workout_context,
      }),
    onSuccess: (data) => {
      setPlanNotes("")
      setSelectedPlanId(data.id)
      showSuccessToast("Personalized plan generated")
      queryClient.invalidateQueries({ queryKey: ["fitness-plans"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  const updatePlanMutation = useMutation({
    mutationFn: (payload: { id: string; title: string }) =>
      fitnessApi.updatePlan(payload.id, { title: payload.title }),
    onSuccess: () => {
      showSuccessToast("Plan renamed")
      queryClient.invalidateQueries({ queryKey: ["fitness-plans"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => fitnessApi.deletePlan(id),
    onSuccess: (_, id) => {
      if (selectedPlanId === id) {
        setSelectedPlanId(null)
      }
      showSuccessToast("Plan deleted")
      queryClient.invalidateQueries({ queryKey: ["fitness-plans"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  useEffect(() => {
    if (selectedPlanId || !recentPlans.length) return
    setSelectedPlanId(recentPlans[0].id)
  }, [recentPlans, selectedPlanId])

  const selectedPlan =
    recentPlans.find((plan) => plan.id === selectedPlanId) ||
    recentPlans[0] ||
    null

  const handleRenameStart = (id: string, title: string) => {
    setRenamingPlanId(id)
    setRenameValue(title)
  }

  const handleRenameSave = () => {
    if (!renamingPlanId) return
    const title = renameValue.trim()
    if (!title) {
      showErrorToast("Title cannot be empty")
      return
    }
    updatePlanMutation.mutate({ id: renamingPlanId, title })
    setRenamingPlanId(null)
  }

  const handleRenameCancel = () => {
    setRenamingPlanId(null)
    setRenameValue("")
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Plan Generator
            </CardTitle>
            <CardDescription>
              Generate personalized workout and diet plans from the stored
              fitness profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  planMutation.mutate({
                    plan_type: "workout",
                    notes: planNotes.trim() || undefined,
                  })
                }
                disabled={planMutation.isPending}
              >
                {planMutation.isPending ? "Generating..." : "Generate Workout Plan"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  planMutation.mutate({
                    plan_type: "diet",
                    notes: planNotes.trim() || undefined,
                    include_workout_context:
                      hasWorkoutPlan && includeWorkoutContext,
                  })
                }
                disabled={planMutation.isPending}
              >
                {planMutation.isPending ? "Generating..." : "Generate Diet Plan"}
              </Button>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="include-workout-context"
                  checked={hasWorkoutPlan && includeWorkoutContext}
                  onCheckedChange={(checked) =>
                    setIncludeWorkoutContext(checked === true)
                  }
                  disabled={!hasWorkoutPlan}
                />
                <div className="space-y-1">
                  <label
                    htmlFor="include-workout-context"
                    className="text-sm font-medium"
                  >
                    Include most recent workout plan
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Use your latest workout plan to tailor meal timing, macros,
                    and recovery.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasWorkoutPlan
                      ? `Using: ${latestWorkoutPlan?.title}`
                      : "Generate a workout plan first to unlock this option."}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes for the coach
                </div>
                <textarea
                  className="min-h-[92px] w-full resize-none rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm shadow-sm transition focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={planNotes}
                  onChange={(event) => setPlanNotes(event.target.value)}
                  placeholder="Add anything that matters (injury limits, dietary rules, training focus, schedule)."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Plans</CardTitle>
            <CardDescription>Your latest workout and diet outputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPlans.length ? (
              recentPlans.slice(0, 6).map((plan) => (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (renamingPlanId === plan.id) return
                    setSelectedPlanId(plan.id)
                  }}
                  onKeyDown={(event) => {
                    if (renamingPlanId === plan.id) return
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedPlanId(plan.id)
                    }
                  }}
                  className={`group flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                    selectedPlan?.id === plan.id
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : "hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {renamingPlanId === plan.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-8 w-full rounded-lg border border-border/60 bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRenameSave()
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRenameCancel()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="truncate font-medium">{plan.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {plan.summary}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{plan.plan_type}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(plan.created_at)}
                    </span>
                    {renamingPlanId !== plan.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => handleRenameStart(plan.id, plan.title)}
                          >
                            <Pencil className="h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              const confirmed = window.confirm(
                                "Delete this plan? This cannot be undone."
                              )
                              if (!confirmed) return
                              deletePlanMutation.mutate(plan.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                Generate your first plan to see it here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-3xl border-border/60 bg-background/80 shadow-sm">
          <CardHeader>
            <CardTitle>Plan Preview</CardTitle>
            <CardDescription>
              Review the full plan right after it is generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPlans.length ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={selectedPlan?.id}
                    onValueChange={(value) => setSelectedPlanId(value)}
                  >
                    <SelectTrigger className="min-w-[240px]">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {recentPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary">
                    {selectedPlan?.plan_type || "plan"}
                  </Badge>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
                  <div className="text-lg font-semibold">
                    {selectedPlan?.title}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {selectedPlan?.summary}
                  </div>
                  <Markdown
                    content={selectedPlan?.content}
                    className="mt-4 text-sm leading-6 text-foreground/90"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                {planMutation.isPending
                  ? "Generating plan..."
                  : "Generate a workout or diet plan to see it here instantly."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
