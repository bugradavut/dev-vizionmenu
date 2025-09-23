"use client"

import * as React from "react"
import {
  BookOpen,
  PieChart,
  Settings2,
  SquareTerminal,
  Tag,
  Shield,
  BarChart3,
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
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const enhancedAuth = useEnhancedAuth()
  const { language } = useLanguage()
  
  // Destructure what we need from enhanced auth
  const { isPlatformAdmin, isChainOwner, isBranchManager, email } = enhancedAuth

  // Use centralized translations
  const t = translations[language] || translations.en

  // Create navigation data based on user type
  const createNavData = () => {
    // Base navigation for platform admins (only dashboard and admin settings)
    if (isPlatformAdmin) {
      return {
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
            ],
          },
          {
            title: t.navigation.adminSettings,
            url: "/admin-settings",
            icon: Shield,
            items: [
              {
                title: language === 'fr' ? 'Chaînes' : 'Chains',
                url: "/admin-settings/chains",
              },
              {
                title: language === 'fr' ? 'Succursales' : 'Branches',
                url: "/admin-settings/branches",
              },
              {
                title: language === 'fr' ? 'Administrateurs Plateforme' : 'Platform Admins',
                url: "/admin-settings/platform-admins",
              },
              {
                title: language === 'fr' ? 'Commission' : 'Commission',
                url: "/admin-settings/commission",
              },
              {
                title: language === 'fr' ? 'Rapports de Commission' : 'Commission Reports',
                url: "/admin-settings/commission-reports",
              },
            ],
          },
        ],
      };
    }

    // Full navigation for branch users
    return {
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
          ],
        },
        // Reports - Chain Owner (full access) and Branch Manager (limited access)
        ...((isChainOwner || isBranchManager) ? [{
          title: language === 'fr' ? 'Rapports' : 'Reports',
          url: "/reports",
          icon: BarChart3,
          items: [
            {
              title: language === 'fr' ? 'Analytiques' : 'Analytics',
              url: "/reports/analytics",
            },
            // Activity logs - Chain Owner only
            ...(isChainOwner ? [{
              title: language === 'fr' ? 'Journaux d\'Activité' : 'Activity Logs',
              url: "/reports/activity",
            }] : []),
          ],
        }] : []),
        // Menu Management - Hide from Chain Owners (branch-specific)
        ...(!isChainOwner ? [{
          title: t.navigation.menuManagement,
          url: "/menu",
          icon: BookOpen,
          items: [
            {
              title: t.navigation.menu,
              url: "/menu",
            },
          ],
        }] : []),
        // Menu Templates - Chain Owner only
        ...(isChainOwner ? [{
          title: language === 'fr' ? 'Gestion de Menu' : 'Menu Management',
          url: "/menu-templates",
          icon: BookOpen,
          items: [
            {
              title: language === 'fr' ? 'Modèles de Menu' : 'Menu Templates',
              url: "/menu-templates",
            },
          ],
        }] : []),
        // Campaigns - Hide from Chain Owners (branch-specific)
        ...(!isChainOwner ? [{
          title: t.navigation.campaigns,
          url: "/campaigns",
          icon: Tag,
          items: [
            {
              title: t.navigation.createCampaign,
              url: "/campaigns/create",
            },
          ],
        }] : []),
        // Orders - Hide from Chain Owners (branch-specific)
        ...(!isChainOwner ? [{
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
        }] : []),
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
            // Branch Settings - Hide from Chain Owners (branch-specific)
            ...(!isChainOwner ? [{
              title: t.navigation.branchSettings,
              url: "/settings/branch",
            }] : []),
            // Payment Settings - Chain Owner only
            ...(isChainOwner ? [{
              title: t.navigation.paymentSettings,
              url: "/settings/payments",
            }] : []),
          ],
        },
        // Platform Admin Section (conditional for branch users who are also platform admin)
        ...(isPlatformAdmin ? [{
          title: t.navigation.adminSettings,
          url: "/admin-settings",
          icon: Shield,
          items: [
            {
              title: language === 'fr' ? 'Chaînes' : 'Chains',
              url: "/admin-settings/chains",
            },
            {
              title: language === 'fr' ? 'Succursales' : 'Branches',
              url: "/admin-settings/branches",
            },
            {
              title: language === 'fr' ? 'Administrateurs Plateforme' : 'Platform Admins',
              url: "/admin-settings/platform-admins",
            },
            {
              title: language === 'fr' ? 'Commission' : 'Commission',
              url: "/admin-settings/commission",
            },
            {
              title: language === 'fr' ? 'Rapports de Commission' : 'Commission Reports',
              url: "/admin-settings/commission-reports",
            },
          ],
        }] : []),
      ],
    };
  };

  const translatedNavData = createNavData();

  // Parse user info from email
  const getUserInfo = () => {
    if (!email) {
      return {
        name: "User",
        email: "user@vizionmenu.com",
        initials: "U"
      }
    }

    const userEmail = email
    const emailPrefix = userEmail.split('@')[0] // john.doe veya test
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
      email: userEmail,
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
