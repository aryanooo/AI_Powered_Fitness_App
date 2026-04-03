import { Activity, ClipboardList, Home, MessageCircle, Users } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const mainItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: ClipboardList, title: "Plans", path: "/plans" },
  { icon: Activity, title: "Progress", path: "/progress" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...mainItems, { icon: Users, title: "Admin", path: "/admin" }]
    : mainItems

  const chatItems: Item[] = [
    { icon: MessageCircle, title: "Coach Chat", path: "/coachhub" },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} label="Main" size="lg" />
        <Main items={chatItems} label="Chat" size="lg" />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
