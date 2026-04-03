import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react"

import { Markdown } from "@/components/Common/Markdown"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { fitnessApi, type CoachChatSessionSummary } from "@/lib/fitness-api"

function formatDate(value?: string | null) {
  if (!value) {
    return "Just now"
  }
  return new Date(value).toLocaleString()
}

export default function CoachWorkspace() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const [question, setQuestion] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionFilter, setSessionFilter] = useState("")
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const { data: profile } = useQuery({
    queryKey: ["fitness-profile"],
    queryFn: fitnessApi.getProfile,
  })
  const { data: sessionSummaries } = useQuery({
    queryKey: ["coach-sessions-summary"],
    queryFn: fitnessApi.getSessionSummaries,
  })

  const filteredSessions =
    sessionSummaries?.data.filter((entry) =>
      entry.session.title.toLowerCase().includes(sessionFilter.toLowerCase())
    ) || []
  const activeSessionId =
    selectedSessionId || filteredSessions[0]?.session.id || null
  const { data: messages } = useQuery({
    queryKey: ["coach-messages", activeSessionId],
    queryFn: () => fitnessApi.getMessages(activeSessionId as string),
    enabled: Boolean(activeSessionId),
  })

  const updateSessionMutation = useMutation({
    mutationFn: (payload: { id: string; title: string }) =>
      fitnessApi.updateSession(payload.id, { title: payload.title }),
    onSuccess: () => {
      showSuccessToast("Chat renamed")
      queryClient.invalidateQueries({ queryKey: ["coach-sessions-summary"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => fitnessApi.deleteSession(id),
    onSuccess: (_, id) => {
      if (activeSessionId === id) {
        setSelectedSessionId(null)
      }
      showSuccessToast("Chat deleted")
      queryClient.invalidateQueries({ queryKey: ["coach-sessions-summary"] })
      queryClient.invalidateQueries({ queryKey: ["coach-messages", id] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  const askMutation = useMutation({
    mutationFn: () =>
      fitnessApi.askCoach({
        question,
        session_id: activeSessionId,
        goal_override: profile?.goal || null,
      }),
    onSuccess: (data) => {
      setQuestion("")
      setSelectedSessionId(data.session.id)
      showSuccessToast("Coach response received")
      queryClient.invalidateQueries({ queryKey: ["coach-sessions-summary"] })
      queryClient.invalidateQueries({
        queryKey: ["coach-messages", data.session.id],
      })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  const groupedSessions = useMemo(() => {
    const groups: Record<string, CoachChatSessionSummary[]> = {
      Today: [],
      Yesterday: [],
      Previous: [],
    }
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)

    filteredSessions.forEach((entry) => {
      const updatedAt = entry.session.updated_at || entry.session.created_at
      const dateValue = updatedAt ? new Date(updatedAt) : now
      if (dateValue >= startOfToday) {
        groups.Today.push(entry)
      } else if (dateValue >= startOfYesterday) {
        groups.Yesterday.push(entry)
      } else {
        groups.Previous.push(entry)
      }
    })
    return groups
  }, [filteredSessions])

  const formatSnippet = (text?: string | null) => {
    if (!text) return "No messages yet."
    const trimmed = text.replace(/\s+/g, " ").trim()
    return trimmed.length > 90 ? `${trimmed.slice(0, 90)}...` : trimmed
  }

  useEffect(() => {
    if (!messagesEndRef.current) return
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
  }, [messages?.data?.length, activeSessionId])

  const handleRenameStart = (id: string, title: string) => {
    setRenamingSessionId(id)
    setRenameValue(title)
  }

  const handleRenameSave = () => {
    if (!renamingSessionId) return
    const title = renameValue.trim()
    if (!title) {
      showErrorToast("Title cannot be empty")
      return
    }
    updateSessionMutation.mutate({ id: renamingSessionId, title })
    setRenamingSessionId(null)
  }

  const handleRenameCancel = () => {
    setRenamingSessionId(null)
    setRenameValue("")
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full lg:w-[300px] lg:shrink-0">
        <Card className="flex h-[calc(100vh-160px)] flex-col rounded-2xl border-border/50 bg-card/60">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Chats</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSessionId(null)
                  setQuestion("")
                }}
              >
                New chat
              </Button>
            </div>
            <Input
              placeholder="Search chats"
              value={sessionFilter}
              onChange={(event) => setSessionFilter(event.target.value)}
            />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-2 pb-3">
            <div className="space-y-6">
              {Object.entries(groupedSessions).map(([label, sessions]) => (
                <div key={label} className="space-y-2">
                  <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  <div className="space-y-1.5">
                    {sessions.map((entry) => {
                      const isActive = activeSessionId === entry.session.id
                      const isRenaming = renamingSessionId === entry.session.id

                      return (
                        <div
                          key={entry.session.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (isRenaming) return
                            setSelectedSessionId(entry.session.id)
                          }}
                          onKeyDown={(event) => {
                            if (isRenaming) return
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              setSelectedSessionId(entry.session.id)
                            }
                          }}
                          className={`group flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                            isActive
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            {isRenaming ? (
                              <div className="flex items-center gap-2">
                                <input
                                  value={renameValue}
                                  onChange={(event) =>
                                    setRenameValue(event.target.value)
                                  }
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
                                <div className="truncate text-sm font-medium">
                                  {entry.session.title}
                                </div>
                                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {formatSnippet(entry.last_message)}
                                </div>
                              </>
                            )}
                          </div>
                          {!isRenaming && (
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
                                  onSelect={() =>
                                    handleRenameStart(
                                      entry.session.id,
                                      entry.session.title
                                    )
                                  }
                                >
                                  <Pencil className="h-4 w-4" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => {
                                    const confirmed = window.confirm(
                                      "Delete this chat? This cannot be undone."
                                    )
                                    if (!confirmed) return
                                    deleteSessionMutation.mutate(entry.session.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      )
                    })}
                    {!sessions.length && (
                      <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        No chats here yet.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!filteredSessions.length && (
              <div className="mt-4 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
                No sessions yet. Your first question will create one
                automatically.
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      <section className="flex-1">
        <Card className="flex h-[calc(100vh-160px)] flex-col rounded-3xl border-border/40 bg-card/70 shadow-sm">
          <CardHeader className="border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {activeSessionId ? "Coach Chat" : "Start a new chat"}
                </CardTitle>
                <CardDescription className="text-sm">
                  Ask about workouts, nutrition, recovery, or goal-specific plans.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSessionId(null)
                  setQuestion("")
                }}
              >
                New chat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mx-auto w-full max-w-3xl space-y-6">
                {messages?.data.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "assistant"
                        ? "rounded-2xl border border-primary/10 bg-primary/5 px-5 py-4 shadow-sm"
                        : "rounded-2xl border border-border/60 bg-background/80 px-5 py-4 shadow-sm"
                    }
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium capitalize">
                        {message.role}
                      </span>
                      <span>{formatDate(message.created_at)}</span>
                    </div>
                    <Markdown content={message.content} />
                  </div>
                ))}
                {!messages?.data.length && (
                  <div className="rounded-2xl border border-dashed px-5 py-6 text-sm text-muted-foreground">
                    Ask the first question to start a coaching session.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="sticky bottom-0 border-t border-border/40 bg-card/90 px-6 py-4 backdrop-blur">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 md:flex-row md:items-end">
                <textarea
                  className="min-h-20 w-full flex-1 resize-none rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm shadow-sm transition focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask the coach: create a 4-day fat-loss workout plan for me..."
                />
                <Button
                  onClick={() => askMutation.mutate()}
                  disabled={askMutation.isPending || question.trim().length < 3}
                  className="self-end md:self-auto"
                >
                  {askMutation.isPending ? "Thinking..." : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
