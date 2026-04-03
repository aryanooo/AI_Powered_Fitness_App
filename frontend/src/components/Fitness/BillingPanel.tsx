import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import useCustomToast from "@/hooks/useCustomToast"
import { fitnessApi } from "@/lib/fitness-api"

export default function BillingPanel() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: fitnessApi.getSubscription,
  })
  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: fitnessApi.getUsage,
  })

  const upgradeMutation = useMutation({
    mutationFn: () => fitnessApi.upgradeSubscription({ plan: "pro" }),
    onSuccess: () => {
      showSuccessToast("Pro plan activated (manual)")
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
      queryClient.invalidateQueries({ queryKey: ["usage"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  const cancelMutation = useMutation({
    mutationFn: () => fitnessApi.cancelSubscription(),
    onSuccess: () => {
      showSuccessToast("Subscription canceled")
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
      queryClient.invalidateQueries({ queryKey: ["usage"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Manual upgrade for now. Payment provider integration is next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge>{subscription?.plan || "free"}</Badge>
            <span className="text-sm text-muted-foreground">
              Status: {subscription?.status || "inactive"}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
            >
              Activate Pro
            </Button>
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              Cancel
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Paid tier uses external LLM usage and payment providers. This demo
            uses a manual toggle while the gateway is integrated.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Limits</CardTitle>
          <CardDescription>Daily limits by plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            Chats today: {usage?.chat_count || 0} /{" "}
            {usage?.limits.chat_per_day || 0}
          </div>
          <div>
            Uploads today: {usage?.upload_count || 0} /{" "}
            {usage?.limits.uploads_per_day || 0}
          </div>
          <div>Document total limit: {usage?.limits.documents_total || 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}
