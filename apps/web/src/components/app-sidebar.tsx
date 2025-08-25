"use client"

import * as React from "react"
import {
  BookOpen,
  PieChart,
  Settings2,
  SquareTerminal,
  Tag,
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
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { language } = useLanguage()

  // Use centralized translations
  const t = translations[language] || translations.en

  // Create translated navigation data using centralized translations
  const translatedNavData = {
    navMain: [
      {
        title: t.navigation.dashboard,
        url: "/dashboard",
        icon: PieChart,
        items: [
          {
            title: t.navigation.overview,
            url: "/dashboard",
          },
          {
            title: t.navigation.analytics,
            url: "/dashboard/analytics",
          },
        ],
      },
      {
        title: t.navigation.menuManagement,
        url: "/menu",
        icon: BookOpen,
        items: [
          {
            title: t.navigation.menu,
            url: "/menu",
          },
        ],
      },
      {
        title: t.navigation.campaigns,
        url: "/campaigns",
        icon: Tag,
        items: [
          {
            title: t.navigation.createCampaign,
            url: "/campaigns/create",
          },
        ],
      },
      {
        title: t.navigation.orders,
        url: "/orders",
        icon: SquareTerminal,
        items: [
          {
            title: t.navigation.liveOrders,
            url: "/orders/live",
          },
          {
            title: t.navigation.orderHistory,
            url: "/orders/history",
          },
          {
            title: t.navigation.kitchenDisplay,
            url: "/orders/kitchen",
          },
        ],
      },
      {
        title: t.navigation.settings,
        url: "/settings",
        icon: Settings2,
        items: [
          {
            title: t.navigation.generalSettings,
            url: "/settings/general",
          },
          {
            title: t.navigation.userManagement,
            url: "/settings/users",
          },
          {
            title: t.navigation.branchSettings,
            url: "/settings/branch",
          },
        ],
      },
    ],
  }

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
        <NavMain items={translatedNavData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userInfo} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
