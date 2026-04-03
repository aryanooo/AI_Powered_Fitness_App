import { createFileRoute } from "@tanstack/react-router"

import ProgressTracker from "@/components/Fitness/ProgressTracker"

export const Route = createFileRoute("/_layout/progress")({
  component: ProgressPage,
  head: () => ({
    meta: [
      {
        title: "Progress - AI Fitness Coach",
      },
    ],
  }),
})

function ProgressPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress Tracking</h1>
        <p className="text-muted-foreground">
          Log weight, workouts, and nutrition data over time.
        </p>
      </div>
      <ProgressTracker />
    </div>
  )
}
