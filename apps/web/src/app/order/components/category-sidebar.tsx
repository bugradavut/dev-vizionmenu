"use client"

import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LayoutGrid } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'
import { getIconComponent } from '@/lib/category-icons'

interface CategorySidebarProps {
  selectedCategory: string
  onCategorySelect: (categoryId: string) => void
  isMobile?: boolean
  customerMenu?: CustomerMenu | null
  loading?: boolean
}

export function CategorySidebar({ 
  selectedCategory, 
  onCategorySelect, 
  isMobile = false, 
  customerMenu,
  loading = false 
}: CategorySidebarProps) {
  const [categories, setCategories] = useState<Array<{
    id: string;
    name: string;
    icon: string;
    item_count: number;
    display_order: number;
  }>>([])
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  // const orderContext = useOrderContext() // Future use for branch-specific categories

  useEffect(() => {
    if (customerMenu) {
      const categoriesWithCounts = customerMenuService.getCategoriesWithCounts(customerMenu)
      setCategories(categoriesWithCounts)
    }
  }, [customerMenu])

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (isMobile) {
    // Mobile: Simple horizontal tabs
    return (
      <div className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-gray-300 scrollbar-corner-transparent">
        <div className="flex gap-2 min-w-max">
          {categories.map((category) => {
          const Icon = getIconComponent(category.icon)
          const isSelected = selectedCategory === category.id
          
          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              aria-label={`Select ${category.name} category`}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
              <span className="text-xs opacity-75">({category.item_count})</span>
            </button>
          )
          })}
        </div>
      </div>
    )
  }

  // Desktop/Tablet: Vertical sidebar
  return (
    <div className="p-4">
      {/* Categories Header with Icon */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">{t.orderPage.sidebar.categories}</h2>
        <LayoutGrid className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-3 pr-4">
          {categories.map((category) => {
            const Icon = getIconComponent(category.icon)
            const isSelected = selectedCategory === category.id
            
            return (
              <Card
                key={category.id}
                className={cn(
                  "p-4 cursor-pointer transition-all border",
                  isSelected 
                    ? "bg-primary border-primary" 
                    : "bg-card border-border hover:bg-muted/50 hover:border-border/80"
                )}
                onClick={() => onCategorySelect(category.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Category Icon with Background */}
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center shrink-0">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  
                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm truncate",
                      isSelected ? "text-white" : "text-foreground"
                    )}>
                      {category.name}
                    </div>
                    <div className={cn(
                      "text-xs mt-1",
                      isSelected ? "text-white/90" : "text-muted-foreground"
                    )}>
                      {category.item_count} {category.item_count === 1 ? t.orderPage.sidebar.item : t.orderPage.sidebar.items}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}