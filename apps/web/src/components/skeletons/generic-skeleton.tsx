// Skeleton import removed - using manual bg-gray-200 for better visibility
import { AppSidebar } from "@/components/app-sidebar"
import { 
  SidebarInset, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function GenericSkeleton() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with Breadcrumb Skeleton */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {/* Breadcrumb Skeleton - Debug */}
            <div className="flex items-center space-x-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <span>/</span>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              <span>/</span>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4 px-4 md:px-8 lg:px-12 pt-8">
          {/* Page Header Skeleton - Debug */}
          <div className="max-w-6xl">
            <div className="mb-8">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Content Cards - Clean Rectangles Only */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[200px] w-full bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 