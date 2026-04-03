import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { fitnessApi, type ProgressLog } from "@/lib/fitness-api"

export default function ProgressTracker() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const [form, setForm] = useState({
    weight_kg: "",
    workout_minutes: "",
    workout_type: "",
    calories: "",
    protein_g: "",
    notes: "",
  })

  const { data } = useQuery({
    queryKey: ["progress-logs"],
    queryFn: fitnessApi.getProgressLogs,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      fitnessApi.createProgressLog({
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        workout_minutes: form.workout_minutes
          ? Number(form.workout_minutes)
          : undefined,
        workout_type: form.workout_type || undefined,
        calories: form.calories ? Number(form.calories) : undefined,
        protein_g: form.protein_g ? Number(form.protein_g) : undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      showSuccessToast("Progress log saved")
      setForm({
        weight_kg: "",
        workout_minutes: "",
        workout_type: "",
        calories: "",
        protein_g: "",
        notes: "",
      })
      queryClient.invalidateQueries({ queryKey: ["progress-logs"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fitnessApi.deleteProgressLog(id),
    onSuccess: () => {
      showSuccessToast("Progress log deleted")
      queryClient.invalidateQueries({ queryKey: ["progress-logs"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle>New Progress Log</CardTitle>
          <CardDescription>
            Track weight, workouts, and nutrition in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input
            placeholder="Weight (kg)"
            value={form.weight_kg}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, weight_kg: event.target.value }))
            }
          />
          <Input
            placeholder="Workout minutes"
            value={form.workout_minutes}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                workout_minutes: event.target.value,
              }))
            }
          />
          <Input
            placeholder="Workout type (e.g., Strength)"
            value={form.workout_type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, workout_type: event.target.value }))
            }
          />
          <Input
            placeholder="Calories"
            value={form.calories}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, calories: event.target.value }))
            }
          />
          <Input
            placeholder="Protein (g)"
            value={form.protein_g}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, protein_g: event.target.value }))
            }
          />
          <Input
            placeholder="Notes"
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
          />
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            Save Log
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
          <CardDescription>Your latest fitness progress entries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.data.map((log: ProgressLog) => (
            <div key={log.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {log.weight_kg ? `${log.weight_kg} kg` : "No weight"} ·{" "}
                    {log.workout_minutes
                      ? `${log.workout_minutes} mins`
                      : "No workout"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.workout_type || "Workout type not set"}
                  </div>
                  {log.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {log.notes}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(log.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {!data?.data.length && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No progress logs yet. Add your first entry.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
