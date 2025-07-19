import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Settings2, 
  Users, 
  Store, 
  Bell, 
  Plug, 
  CreditCard,
  ChevronRight 
} from "lucide-react"
import Link from "next/link"

const settingsCategories = [
  {
    title: "General",
    description: "Manage your general application preferences and theme settings.",
    icon: Settings2,
    href: "/settings/general",
    available: true
  },
  {
    title: "User Management", 
    description: "Manage restaurant staff, roles, and permissions.",
    icon: Users,
    href: "/settings/users",
    available: true
  },
  {
    title: "Restaurant Settings",
    description: "Configure restaurant information, hours, and basic details.",
    icon: Store,
    href: "/settings/restaurant",
    available: false
  },
  {
    title: "Notifications",
    description: "Set up email and SMS notifications for orders and updates.",
    icon: Bell,
    href: "/settings/notifications", 
    available: false
  },
  {
    title: "Integrations",
    description: "Connect with Uber Eats, DoorDash, and other delivery platforms.",
    icon: Plug,
    href: "/settings/integrations",
    available: false
  },
  {
    title: "Billing & Plans",
    description: "Manage your subscription, billing, and payment methods.",
    icon: CreditCard,
    href: "/settings/billing",
    available: false
  }
]

export default function SettingsPage() {
  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Settings</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 py-4 px-4 md:px-8 lg:px-12 pt-8">
            <div className="max-w-6xl">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
                <p className="text-muted-foreground mt-2">
                  Manage your restaurant settings and preferences.
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
              {settingsCategories.map((category) => {
                const IconComponent = category.icon
                
                if (category.available) {
                  return (
                    <Link key={category.title} href={category.href}>
                      <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{category.title}</CardTitle>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm">
                            {category.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                }
                
                return (
                  <Card key={category.title} className="opacity-60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base text-muted-foreground">{category.title}</CardTitle>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        Coming Soon
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
} 