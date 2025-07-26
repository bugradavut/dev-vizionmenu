"use client"

import * as React from "react"
import {
  BookOpen,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"

// Navigation data
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: PieChart,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        {
          title: "Analytics",
          url: "/dashboard/analytics",
        },
      ],
    },
    {
      title: "Menu Management",
      url: "/menu",
      icon: BookOpen,
      items: [
        {
          title: "Categories",
          url: "/menu/categories",
        },
        {
          title: "Items",
          url: "/menu/items",
        },
        {
          title: "Pricing",
          url: "/menu/pricing",
        },
      ],
    },
    {
      title: "Orders",
      url: "/orders",
      icon: SquareTerminal,
      items: [
        {
          title: "Live Orders",
          url: "/orders/live",
        },
        {
          title: "Order History",
          url: "/orders/history",
        },
        {
          title: "Kitchen Display",
          url: "/orders/kitchen",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/settings/general",
        },
        {
          title: "User Management",
          url: "/settings/users",
        },
        {
          title: "Branch Settings",
          url: "/settings/branch",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  // Parse user info from email
  const getUserInfo = () => {
    if (!user?.email) {
      return {
        name: "User",
        email: "user@vizionmenu.com",
        initials: "U"
      }
    }

    const email = user.email
    const emailPrefix = email.split('@')[0] // john.doe veya test
    const nameParts = emailPrefix.split('.') // ['john', 'doe'] veya ['test']
    
    // Capitalize each part
    const capitalizedParts = nameParts.map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    
    // Full name: "John Doe" veya "Test"
    const fullName = capitalizedParts.join(' ')
    
    // Initials logic
    let initials: string
    if (nameParts.length === 1) {
      // Tek kelime: test → "T", admin → "A"
      initials = capitalizedParts[0]?.charAt(0) || 'U'
    } else {
      // Çoklu kelime: john.doe → "JD", jane.middle.smith → "JS"
      const firstInitial = capitalizedParts[0]?.charAt(0) || 'U'
      const lastInitial = capitalizedParts[capitalizedParts.length - 1]?.charAt(0) || ''
      initials = firstInitial + lastInitial
    }
    
    return {
      name: fullName,
      email: email,
      initials: initials
    }
  }

  const userInfo = getUserInfo()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <div className="border-b border-sidebar-border mx-4"></div>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userInfo} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
