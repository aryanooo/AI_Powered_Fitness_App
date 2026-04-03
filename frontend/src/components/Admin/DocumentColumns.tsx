import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fitnessApi, type KnowledgeDocument } from "@/lib/fitness-api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import useCustomToast from "@/hooks/useCustomToast"

function DocumentDeleteButton({ documentId }: { documentId: string }) {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const mutation = useMutation({
    mutationFn: () => fitnessApi.deleteAdminDocument(documentId),
    onSuccess: () => {
      showSuccessToast("Document deleted")
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] })
    },
    onError: (error: Error) => showErrorToast(error.message),
  })

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      Delete
    </Button>
  )
}

export const documentColumns: ColumnDef<KnowledgeDocument>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "owner_id",
    header: "Owner",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.original.owner_id}</span>
    ),
  },
  {
    accessorKey: "chunk_count",
    header: "Chunks",
    cell: ({ row }) => <span>{row.original.chunk_count}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <DocumentDeleteButton documentId={row.original.id} />,
  },
]
