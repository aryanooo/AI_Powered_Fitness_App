import { createFileRoute } from "@tanstack/react-router"

import CoachWorkspace from "@/components/Fitness/CoachWorkspace"

export const Route = createFileRoute("/_layout/coachhub")({
  component: CoachHub,
  head: () => ({
    meta: [
      {
        title: "Coach Chat - AI Fitness Coach",
      },
    ],
  }),
})

function CoachHub() {
  return (
    <CoachWorkspace />
  )
}
