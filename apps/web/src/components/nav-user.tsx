"use client"

import * as React from "react"
import {
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { NotificationsDialog } from "@/components/notifications-dialog"
import { usePendingWebSrmCount } from "@/hooks/use-pending-websrm-count"
import { useCertificateExpiry } from "@/hooks/use-certificate-expiry"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    initials: string
    avatar?: string
  }
}) {
  const { isMobile } = useSidebar()
  const { signOut } = useAuth()
  const router = useRouter()
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const { count: pendingCount, refetch: refetchCount } = usePendingWebSrmCount()

  // FO-127: Certificate expiry monitoring
  // Check once per day (24 hours) - certificate expiry happens over days/months, not hours
  const { status: certificateStatus } = useCertificateExpiry({
    enabled: true,
    refetchInterval: 86400000, // 24 hours (24 * 60 * 60 * 1000)
  })

  // Calculate total notification count
  const totalNotifications = pendingCount + (certificateStatus?.shouldShowNotification ? 1 : 0)

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      // Even if there's an error, redirect to login
      router.push("/login")
    }
  }

  const handleNotificationsClick = () => {
    setNotificationsOpen(true)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="border-t border-sidebar-border pt-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-full bg-primary text-primary-foreground font-semibold">{user.initials}</AvatarFallback>
                </Avatar>
                {totalNotifications > 0 && (
                  <Badge
                    variant="outline"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-200 text-red-700 border-red-500 rounded-full"
                  >
                    {totalNotifications}
                  </Badge>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-full bg-primary text-primary-foreground font-semibold">{user.initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNotificationsClick}>
              <Bell />
              Notifications
              {totalNotifications > 0 && (
                <Badge
                  variant="outline"
                  className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-200 text-red-700 border-red-500 rounded-full"
                >
                  {totalNotifications}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {/* Notifications Dialog */}
      <NotificationsDialog
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        pendingCount={pendingCount}
        certificateStatus={certificateStatus}
        onSendSuccess={refetchCount}
      />
    </SidebarMenu>
  )
}
