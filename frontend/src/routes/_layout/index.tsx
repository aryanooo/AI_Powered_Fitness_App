import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { fitnessApi } from "@/lib/fitness-api"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - AI Fitness Coach",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const { data: profile } = useQuery({
    queryKey: ["fitness-profile"],
    queryFn: fitnessApi.getProfile,
  })
  const { data: plans } = useQuery({
    queryKey: ["fitness-plans"],
    queryFn: fitnessApi.getPlans,
  })
  const { data: documents } = useQuery({
    queryKey: ["fitness-documents"],
    queryFn: fitnessApi.getDocuments,
  })
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const uploadMutation = useMutation({
    mutationFn: (file: File) => fitnessApi.uploadDocument(file),
    onSuccess: () => {
      showSuccessToast("Knowledge document uploaded")
      queryClient.invalidateQueries({ queryKey: ["fitness-documents"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-8">
        <Badge variant="secondary" className="mb-4">
          Final Year Project Build
        </Badge>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight">
          Hi, {currentUser?.full_name || currentUser?.email}. Your AI Fitness
          Coach workspace is ready to personalize.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Complete your fitness profile, upload knowledge documents, and
          generate workout or diet plans from the Plans tab.
        </p>
        <div className="mt-5">
          <Button asChild>
            <Link to="/settings" search={{ tab: "fitness-profile" }}>
              Complete profile
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current Goal</CardTitle>
            <CardDescription>Personalization anchor</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {profile?.goal || "Add your goal in Settings"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Indexed RAG documents</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {documents?.count || 0} documents
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Generated Plans</CardTitle>
            <CardDescription>Workout and diet outputs</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {plans?.count || 0} saved plans
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>
              Upload PDFs or notes so the coach answers from your documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  uploadMutation.mutate(file)
                }
              }}
            />
            <div className="space-y-3">
              {documents?.data.map((document) => (
                <div key={document.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{document.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {document.chunk_count} chunks indexed
                      </div>
                    </div>
                    <Badge variant="outline">{document.status}</Badge>
                  </div>
                </div>
              ))}
              {!documents?.data.length && (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Upload a fitness PDF, notes, or research summary to activate
                  the RAG layer.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
