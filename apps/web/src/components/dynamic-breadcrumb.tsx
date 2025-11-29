'use client'

import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

// Route configuration for breadcrumbs
const breadcrumbConfig = {
  '/dashboard': {
    title: 'navigation.dashboard',
    href: '/dashboard'
  },
  '/orders': {
    title: 'navigation.orders',
    href: '/orders'
  },
  '/orders/live': {
    title: 'navigation.liveOrders',
    href: '/orders/live'
  },
  '/orders/history': {
    title: 'navigation.orderHistory',
    href: '/orders/history'
  },
  '/orders/kitchen': {
    title: 'navigation.kitchenDisplay',
    href: '/orders/kitchen'
  },
  '/settings': {
    title: 'navigation.settings',
    href: '/settings'
  },
  '/settings/general': {
    title: 'navigation.generalSettings',
    href: '/settings/general'
  },
  '/settings/branch': {
    title: 'navigation.branchSettings',
    href: '/settings/branch'
  },
  '/settings/branch/payment-methods': {
    title: 'navigation.paymentMethods',
    href: '/settings/branch/payment-methods',
    parent: '/settings/branch'
  },
  '/settings/branch/delivery': {
    title: 'navigation.deliverySettings',
    href: '/settings/branch/delivery',
    parent: '/settings/branch'
  },
  '/settings/branch/notifications': {
    title: 'navigation.notifications',
    href: '/settings/branch/notifications',
    parent: '/settings/branch'
  },
  '/settings/branch/integrations': {
    title: 'navigation.integrations',
    href: '/settings/branch/integrations',
    parent: '/settings/branch'
  },
  '/settings/branch/tax-registration': {
    title: 'navigation.taxRegistration',
    href: '/settings/branch/tax-registration',
    parent: '/settings/branch'
  },
  '/settings/branch/websrm-certificate': {
    title: 'navigation.websrmCertificate',
    href: '/settings/branch/websrm-certificate',
    parent: '/settings/branch'
  },
  '/settings/users': {
    title: 'navigation.userManagement',
    href: '/settings/users'
  },
  '/admin-settings': {
    title: 'navigation.adminSettings',
    href: '/admin-settings'
  },
  '/admin-settings/chains': {
    title: 'navigation.restaurantChains',
    href: '/admin-settings/chains',
    parent: '/admin-settings'
  },
  '/admin-settings/branches': {
    title: 'navigation.branchManagement',
    href: '/admin-settings/branches',
    parent: '/admin-settings'
  },
  '/admin-settings/platform-admins': {
    title: 'navigation.platformAdmins',
    href: '/admin-settings/platform-admins',
    parent: '/admin-settings'
  },
  '/reports': {
    title: 'navigation.reports',
    href: '/reports'
  },
  '/reports/activity': {
    title: 'navigation.activityLogs',
    href: '/reports/activity',
    parent: '/reports'
  },
  '/reports/analytics': {
    title: 'navigation.analytics',
    href: '/reports/analytics'
  },
  '/reports/daily-closing': {
    title: 'navigation.dailyClosing',
    href: '/reports/daily-closing'
  },
  '/reports/offline-sessions': {
    title: 'navigation.offlineSessions',
    href: '/reports/offline-sessions'
  },
  '/campaigns/create': {
    title: 'navigation.campaigns',
    href: '/campaigns/create'
  },
  '/settings/data-export': {
    title: 'navigation.dataExport',
    href: '/settings/data-export'
  }
} as const

type BreadcrumbPath = keyof typeof breadcrumbConfig

interface BreadcrumbConfig {
  title: string
  href: string
  parent?: string
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  // Helper function to get translation value
  const getTranslation = (key: string): string => {
    // Handle nested translation keys like 'navigation.dashboard'
    const parts = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = t
    
    for (const part of parts) {
      value = value?.[part]
    }
    
    // If translation key not found, return the key itself as fallback
    return typeof value === 'string' ? value : key
  }

  // Build breadcrumb trail from current path
  const buildBreadcrumbTrail = (currentPath: string): BreadcrumbConfig[] => {
    const trail: BreadcrumbConfig[] = []
    const currentConfig = breadcrumbConfig[currentPath as BreadcrumbPath]
    
    if (!currentConfig) {
      return trail
    }
    
    // Recursively build parent trail
    if ('parent' in currentConfig && currentConfig.parent) {
      trail.push(...buildBreadcrumbTrail(currentConfig.parent))
    }
    
    trail.push({
      title: currentConfig.title,
      href: currentConfig.href,
      parent: 'parent' in currentConfig ? currentConfig.parent : undefined
    })
    return trail
  }

  // Handle dynamic routes like /orders/[orderId]
  const getEffectivePath = (pathname: string): string => {
    // Check for exact matches first
    if (breadcrumbConfig[pathname as BreadcrumbPath]) {
      return pathname
    }
    
    // Handle dynamic order routes
    if (pathname.match(/^\/orders\/[^\/]+$/)) {
      // This is /orders/[orderId] - treat as orders page with order detail
      return '/orders'
    }
    
    return pathname
  }

  const effectivePath = getEffectivePath(pathname)
  const breadcrumbTrail = buildBreadcrumbTrail(effectivePath)
  
  // Don't render if no valid breadcrumb config found
  if (breadcrumbTrail.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbTrail.map((item, index) => {
          const isLast = index === breadcrumbTrail.length - 1
          const translatedTitle = getTranslation(item.title)
          
          return (
            <div key={item.href} className="flex items-center">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{translatedTitle}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href}>
                    {translatedTitle}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}