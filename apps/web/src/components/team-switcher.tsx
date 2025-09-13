"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function TeamSwitcher() {
  const router = useRouter()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          onClick={() => router.push('/dashboard')}
          className="cursor-pointer hover:bg-sidebar-accent"
        >
          <Image 
            src="https://cdn.prod.website-files.com/67b6f7ecc0b5b185628fc902/67b6fa305fe70f88ef38db30_logo.svg"
            alt="VizionMenu"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
