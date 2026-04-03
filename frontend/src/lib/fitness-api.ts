export type UserProfile = {
  id: string
  user_id: string
  age?: number | null
  height_cm?: number | null
  weight_kg?: number | null
  gender?: string | null
  goal?: string | null
  activity_level?: string | null
  dietary_preference?: string | null
  injuries?: string | null
  experience_level?: string | null
  preferred_workout_days?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type FitnessPlan = {
  id: string
  user_id: string
  plan_type: string
  title: string
  summary: string
  content: string
  status: string
  created_at?: string | null
}

export type KnowledgeDocument = {
  id: string
  owner_id: string
  title: string
  source_type: string
  mime_type?: string | null
  status: string
  chunk_count: number
  storage_path: string
  created_at?: string | null
}

export type CoachChatSession = {
  id: string
  user_id: string
  title: string
  created_at?: string | null
  updated_at?: string | null
}

export type CoachChatMessage = {
  id: string
  session_id: string
  role: string
  content: string
  citations: string[]
  created_at?: string | null
}

export type CoachChatResponse = {
  session: CoachChatSession
  answer: CoachChatMessage
  citations: string[]
  context_snippets: string[]
}

export type CoachChatSessionSummary = {
  session: CoachChatSession
  last_message?: string | null
  last_role?: string | null
}

export type ProgressLog = {
  id: string
  user_id: string
  logged_at: string
  weight_kg?: number | null
  body_fat_pct?: number | null
  workout_minutes?: number | null
  workout_type?: string | null
  calories?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  notes?: string | null
}

export type Subscription = {
  id: string
  user_id: string
  plan: string
  status: string
  provider?: string | null
  external_id?: string | null
  current_period_end?: string | null
  created_at?: string | null
}

export type UsageSummary = {
  date: string
  chat_count: number
  upload_count: number
  limits: {
    plan: string
    chat_per_day: number
    uploads_per_day: number
    documents_total: number
  }
}

const API_BASE = import.meta.env.VITE_API_URL

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("access_token")
  const headers = new Headers(init?.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || "Request failed")
  }

  return response.json() as Promise<T>
}

export const fitnessApi = {
  getProfile: () => apiFetch<UserProfile | null>("/api/v1/profiles/me"),
  saveProfile: (payload: Partial<UserProfile>) =>
    apiFetch<UserProfile>("/api/v1/profiles/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getPlans: () =>
    apiFetch<{ data: FitnessPlan[]; count: number }>("/api/v1/coach/plans"),
  generatePlan: (payload: {
    plan_type: string
    goal_override?: string
    notes?: string
    include_workout_context?: boolean
  }) =>
    apiFetch<FitnessPlan>("/api/v1/coach/plans/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updatePlan: (id: string, payload: { title?: string }) =>
    apiFetch<FitnessPlan>(`/api/v1/coach/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deletePlan: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/coach/plans/${id}`, {
      method: "DELETE",
    }),
  getDocuments: () =>
    apiFetch<{ data: KnowledgeDocument[]; count: number }>("/api/v1/documents"),
  uploadDocument: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiFetch<KnowledgeDocument>("/api/v1/documents/upload", {
      method: "POST",
      body: formData,
    })
  },
  getSessions: () =>
    apiFetch<{ data: CoachChatSession[]; count: number }>("/api/v1/coach/sessions"),
  updateSession: (id: string, payload: { title?: string }) =>
    apiFetch<CoachChatSession>(`/api/v1/coach/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteSession: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/coach/sessions/${id}`, {
      method: "DELETE",
    }),
  getSessionSummaries: () =>
    apiFetch<{ data: CoachChatSessionSummary[]; count: number }>(
      "/api/v1/coach/sessions/summary"
    ),
  getMessages: (sessionId: string) =>
    apiFetch<{ data: CoachChatMessage[]; count: number }>(
      `/api/v1/coach/sessions/${sessionId}/messages`
    ),
  askCoach: (payload: {
    question: string
    session_id?: string | null
    goal_override?: string | null
  }) =>
    apiFetch<CoachChatResponse>("/api/v1/coach/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getProgressLogs: () =>
    apiFetch<{ data: ProgressLog[]; count: number }>("/api/v1/progress/logs"),
  createProgressLog: (payload: Partial<ProgressLog>) =>
    apiFetch<ProgressLog>("/api/v1/progress/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteProgressLog: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/progress/logs/${id}`, {
      method: "DELETE",
    }),
  getSubscription: () => apiFetch<Subscription | null>("/api/v1/billing/subscription"),
  upgradeSubscription: (payload: Partial<Subscription>) =>
    apiFetch<Subscription>("/api/v1/billing/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  cancelSubscription: () =>
    apiFetch<Subscription | null>("/api/v1/billing/cancel", { method: "POST" }),
  getUsage: () => apiFetch<UsageSummary>("/api/v1/billing/usage"),
  getAdminDocuments: () =>
    apiFetch<{ data: KnowledgeDocument[]; count: number }>(
      "/api/v1/admin/documents"
    ),
  deleteAdminDocument: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/admin/documents/${id}`, {
      method: "DELETE",
    }),
}
