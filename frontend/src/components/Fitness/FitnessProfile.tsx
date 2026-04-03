import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"

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
import { fitnessApi } from "@/lib/fitness-api"

type ProfileFormData = {
  age: string
  height_cm: string
  weight_kg: string
  gender: string
  goal: string
  activity_level: string
  dietary_preference: string
  injuries: string
  experience_level: string
  preferred_workout_days: string
}

function toNumber(value: string) {
  if (!value.trim()) {
    return undefined
  }
  return Number(value)
}

export default function FitnessProfile() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const { data: profile } = useQuery({
    queryKey: ["fitness-profile"],
    queryFn: fitnessApi.getProfile,
  })

  const form = useForm<ProfileFormData>({
    defaultValues: {
      age: "",
      height_cm: "",
      weight_kg: "",
      gender: "",
      goal: "",
      activity_level: "",
      dietary_preference: "",
      injuries: "",
      experience_level: "",
      preferred_workout_days: "",
    },
  })

  useEffect(() => {
    if (!profile) {
      return
    }
    form.reset({
      age: profile.age?.toString() || "",
      height_cm: profile.height_cm?.toString() || "",
      weight_kg: profile.weight_kg?.toString() || "",
      gender: profile.gender || "",
      goal: profile.goal || "",
      activity_level: profile.activity_level || "",
      dietary_preference: profile.dietary_preference || "",
      injuries: profile.injuries || "",
      experience_level: profile.experience_level || "",
      preferred_workout_days: profile.preferred_workout_days?.toString() || "",
    })
  }, [form, profile])

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      fitnessApi.saveProfile({
        age: toNumber(data.age),
        height_cm: toNumber(data.height_cm),
        weight_kg: toNumber(data.weight_kg),
        gender: data.gender || undefined,
        goal: data.goal || undefined,
        activity_level: data.activity_level || undefined,
        dietary_preference: data.dietary_preference || undefined,
        injuries: data.injuries || undefined,
        experience_level: data.experience_level || undefined,
        preferred_workout_days: toNumber(data.preferred_workout_days),
      }),
    onSuccess: () => {
      showSuccessToast("Fitness profile updated")
      queryClient.invalidateQueries({ queryKey: ["fitness-profile"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fitness Profile</CardTitle>
        <CardDescription>
          Store the details used to personalize workout plans, diet guidance,
          and coach chat responses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        >
          <Input placeholder="Age" {...form.register("age")} />
          <Input placeholder="Height (cm)" {...form.register("height_cm")} />
          <Input placeholder="Weight (kg)" {...form.register("weight_kg")} />
          <Input placeholder="Gender" {...form.register("gender")} />
          <Input placeholder="Goal" {...form.register("goal")} />
          <Input placeholder="Activity level" {...form.register("activity_level")} />
          <Input
            placeholder="Dietary preference"
            {...form.register("dietary_preference")}
          />
          <Input
            placeholder="Experience level"
            {...form.register("experience_level")}
          />
          <Input
            placeholder="Preferred workout days"
            {...form.register("preferred_workout_days")}
          />
          <div className="md:col-span-2">
            <Input
              placeholder="Injuries or limitations"
              {...form.register("injuries")}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Fitness Profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
