"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  // Initialize menu states from localStorage and current path
  useEffect(() => {
    const savedMenuStates = localStorage.getItem('vizion-menu-sidebar-state')
    let initialStates: Record<string, boolean> = {}

    if (savedMenuStates) {
      try {
        initialStates = JSON.parse(savedMenuStates)
      } catch {
        console.warn('Failed to parse saved menu states')
      }
    }

    // Auto-open menu if current path matches any sub-item
    items.forEach((item) => {
      if (item.items) {
        const hasActiveSubItem = item.items.some(subItem => pathname === subItem.url)
        if (hasActiveSubItem) {
          initialStates[item.title] = true
        } else if (!(item.title in initialStates)) {
          // Keep existing state or default to closed  
          initialStates[item.title] = false
        }
      }
    })

    setOpenMenus(initialStates)
  }, [pathname, items])

  // Save menu states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('vizion-menu-sidebar-state', JSON.stringify(openMenus))
  }, [openMenus])

  const toggleMenu = (menuTitle: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuTitle]: !prev[menuTitle]
    }))
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            open={openMenus[item.title] || false}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton 
                  tooltip={item.title}
                  onClick={() => toggleMenu(item.title)}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton 
                        asChild
                        isActive={pathname === subItem.url}
                      >
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
