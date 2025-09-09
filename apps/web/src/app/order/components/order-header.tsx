"use client"

import { useState } from 'react'
import { useOrderContext } from '../contexts/order-context'
import { useCart } from '../contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { useMinimumOrder } from '@/hooks/use-minimum-order'
import { translations } from '@/lib/translations'
import { MapPin, Store, Search, X, Globe, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PreOrderModal } from './pre-order-modal'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

interface OrderHeaderProps {
  branchName?: string
  branchAddress?: string
  branchId?: string
  onSearch?: (query: string) => void
  onPreOrderConfirm?: (date: string, time: string) => void
  hideTitle?: boolean
  showMinimumOrderOnly?: boolean
}

export function OrderHeader({ branchName, branchId, onSearch, onPreOrderConfirm, hideTitle = false, showMinimumOrderOnly = false }: OrderHeaderProps) {
  const { tableNumber, zone, isQROrder, source } = useOrderContext()
  const { preOrder, setPreOrder, clearPreOrder } = useCart()
  const { language, setLanguage } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPreOrderModalOpen, setIsPreOrderModalOpen] = useState(false)
  const t = translations[language] || translations.en
  
  // Fetch minimum order amount (only for web users)
  const { minimumOrderAmount, isLoading: isMinimumOrderLoading } = useMinimumOrder({
    branchId,
    enabled: source === 'web' // Only fetch for web users, not QR users
  })
  
  // DEBUG: Console log for debugging (remove in production)
  // console.log('OrderHeader Debug:', { source, branchId, minimumOrderAmount, isMinimumOrderLoading })

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const clearSearch = () => {
    setSearchQuery('')
    onSearch?.('')
  }

  const handlePreOrderConfirm = (date: string, time: string) => {
    // Create scheduled datetime
    const scheduledDateTime = createScheduledDateTime(date, time)
    
    // Update cart context with pre-order data
    setPreOrder({
      isPreOrder: true,
      scheduledDate: date,
      scheduledTime: time,
      scheduledDateTime
    });
    
    // Call parent callback if provided (for backward compatibility)
    onPreOrderConfirm?.(date, time)
  }

  // Helper function to create scheduled datetime
  const createScheduledDateTime = (date: string, time: string): Date => {
    const today = new Date()
    let targetDate: Date

    if (date === 'today') {
      targetDate = new Date(today)
    } else if (date === 'tomorrow') {
      targetDate = new Date(today)
      targetDate.setDate(today.getDate() + 1)
    } else {
      targetDate = new Date(date)
    }

    // Parse time and set it
    const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (timeParts) {
      let hours = parseInt(timeParts[1])
      const minutes = parseInt(timeParts[2])
      const meridiem = timeParts[3].toUpperCase()
      
      if (meridiem === 'PM' && hours !== 12) hours += 12
      if (meridiem === 'AM' && hours === 12) hours = 0
      
      targetDate.setHours(hours, minutes, 0, 0)
    }

    return targetDate
  }

  // If showMinimumOrderOnly is true, only show minimum order amount
  if (showMinimumOrderOnly) {
    return (
      <>
        {source === 'web' && minimumOrderAmount > 0 && !isMinimumOrderLoading && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-md">
            <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
              {language === 'fr' ? 'Min. ' : 'Min. '}
              {language === 'fr' 
                ? `${minimumOrderAmount.toFixed(2)} $`
                : `$${minimumOrderAmount.toFixed(2)}`
              }
            </span>
          </div>
        )}
      </>
    )
  }

  // If hideTitle is true, only show the action items (search, language, schedule)
  if (hideTitle) {
    return (
      <>
        <div className="flex items-center gap-2 md:gap-4 w-full">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder={t.orderPage.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Language Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 flex-shrink-0">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'fr' ? 'FR' : 'EN'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                {t.orderPage.english}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('fr')}>
                {t.orderPage.french}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Pre-Order Buttons */}
          {preOrder.isPreOrder ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Scheduled Button with Primary Color */}
              <div 
                className="flex items-center h-8 rounded-md text-white text-sm font-medium overflow-hidden"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {/* Main button area */}
                <button
                  onClick={() => setIsPreOrderModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1 hover:opacity-90 transition-opacity"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {language === 'fr' ? 'Programmé' : 'Scheduled'}
                  </span>
                </button>
                
                {/* X button with white background */}
                <div className="bg-white rounded-md ml-1 mr-1">
                  <button
                    onClick={clearPreOrder}
                    className="flex items-center justify-center w-6 h-6 text-red-500 hover:bg-gray-50 rounded-md transition-colors"
                    title={language === 'fr' ? 'Annuler la programmation' : 'Cancel scheduling'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline"
              size="sm" 
              className="h-9 gap-2 flex-shrink-0" 
              onClick={() => setIsPreOrderModalOpen(true)}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === 'fr' ? 'Programmer' : 'Schedule'}
              </span>
            </Button>
          )}
        </div>

        {/* Pre-Order Modal */}
        <PreOrderModal
          isOpen={isPreOrderModalOpen}
          onClose={() => setIsPreOrderModalOpen(false)}
          onConfirm={handlePreOrderConfirm}
          currentSchedule={preOrder.isPreOrder ? {
            date: preOrder.scheduledDate!,
            time: preOrder.scheduledTime!
          } : undefined}
        />
      </>
    )
  }

  return (
    <div className="h-16 bg-card border-b border-border px-4 flex items-center justify-between">
      {/* Left - Location + Minimum Order */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {/* Restaurant Name */}
        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
          <Store className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm truncate">
            {branchName || 'Restaurant'}
          </span>
        </div>

        {/* Minimum Order Amount - Web Users Only */}
        {source === 'web' && minimumOrderAmount > 0 && !isMinimumOrderLoading && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-md flex-shrink-0">
            <span className="text-sm font-medium text-orange-900 dark:text-orange-100 whitespace-nowrap">
              {language === 'fr' ? 'Min. ' : 'Min. '}
              {language === 'fr' 
                ? `${minimumOrderAmount.toFixed(2)} $`
                : `$${minimumOrderAmount.toFixed(2)}`
              }
            </span>
          </div>
        )}
      </div>

      {/* Center/Right - QR Info + Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {/* QR Order Info */}
        {isQROrder && tableNumber && (
          <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md flex-shrink-0">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs md:text-sm font-medium text-blue-900 dark:text-blue-100 whitespace-nowrap">
              {zone === 'Screen' 
                ? 'Screen'
                : zone 
                ? t.orderPage.tableInfoWithZone.replace('{number}', tableNumber?.toString() || '').replace('{zone}', zone)
                : t.orderPage.tableInfo.replace('{number}', tableNumber?.toString() || '')
              }
            </span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative w-48 md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder={t.orderPage.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Language Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === 'fr' ? 'FR' : 'EN'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('en')}>
              {t.orderPage.english}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('fr')}>
              {t.orderPage.french}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Pre-Order Buttons */}
        {preOrder.isPreOrder ? (
          <div className="flex items-center gap-2">
            {/* Scheduled Button with Primary Color */}
            <div 
              className="flex items-center h-8 rounded-md text-white text-sm font-medium overflow-hidden"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {/* Main button area */}
              <button
                onClick={() => setIsPreOrderModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1 hover:opacity-90 transition-opacity"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'fr' ? 'Programmé' : 'Scheduled'}
                </span>
              </button>
              
              {/* X button with white background */}
              <div className="bg-white rounded-md ml-1 mr-1">
                <button
                  onClick={clearPreOrder}
                  className="flex items-center justify-center w-6 h-6 text-red-500 hover:bg-gray-50 rounded-md transition-colors"
                  title={language === 'fr' ? 'Annuler la programmation' : 'Cancel scheduling'}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline"
            size="sm" 
            className="h-9 gap-2" 
            onClick={() => setIsPreOrderModalOpen(true)}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'fr' ? 'Programmer' : 'Schedule'}
            </span>
          </Button>
        )}
      </div>

      {/* Pre-Order Modal */}
      <PreOrderModal
        isOpen={isPreOrderModalOpen}
        onClose={() => setIsPreOrderModalOpen(false)}
        onConfirm={handlePreOrderConfirm}
        currentSchedule={preOrder.isPreOrder ? {
          date: preOrder.scheduledDate!,
          time: preOrder.scheduledTime!
        } : undefined}
      />
    </div>
  )
}