import { createFileRoute } from "@tanstack/react-router"

import PlanWorkspace from "@/components/Fitness/PlanWorkspace"

export const Route = createFileRoute("/_layout/plans")({
  component: Plans,
  head: () => ({
    meta: [
      {
        title: "Plans - AI Fitness Coach",
      },
    ],
  }),
})

function Plans() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
        <p className="text-muted-foreground">
          Generate and review workout and diet plans tailored to your profile.
        </p>
      </div>
      <PlanWorkspace />
    </div>
  )
}
