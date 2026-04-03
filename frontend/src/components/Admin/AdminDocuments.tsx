import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"

import { fitnessApi } from "@/lib/fitness-api"
import { DataTable } from "@/components/Common/DataTable"
import PendingUsers from "@/components/Pending/PendingUsers"
import { documentColumns } from "./DocumentColumns"

function getDocumentsQueryOptions() {
  return {
    queryFn: () => fitnessApi.getAdminDocuments(),
    queryKey: ["admin-documents"],
  }
}

function AdminDocumentsTableContent() {
  const { data } = useSuspenseQuery(getDocumentsQueryOptions())
  return <DataTable columns={documentColumns} data={data.data} />
}

export default function AdminDocuments() {
  return (
    <Suspense fallback={<PendingUsers />}>
      <AdminDocumentsTableContent />
    </Suspense>
  )
}
