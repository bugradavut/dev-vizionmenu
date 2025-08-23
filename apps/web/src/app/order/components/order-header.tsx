"use client"

import { useState } from 'react'
import Image from 'next/image'
import { useOrderContext } from '../contexts/order-context'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { MapPin, Store, Search, X, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

interface OrderHeaderProps {
  branchName?: string
  branchAddress?: string
  onSearch?: (query: string) => void
}

export function OrderHeader({ branchName, onSearch }: OrderHeaderProps) {
  const { tableNumber, zone, isQROrder } = useOrderContext()
  const { language, setLanguage } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const t = translations[language] || translations.en

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const clearSearch = () => {
    setSearchQuery('')
    onSearch?.('')
  }

  return (
    <div className="h-16 bg-card border-b border-border px-4 flex items-center justify-between">
      {/* Left - Brand and Location */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-background">
            <Image 
              src="/web.webp"
              alt="Vizion Menu"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-lg text-foreground hidden sm:block">{t.orderPage.branding}</span>
          <span className="font-bold text-base text-foreground sm:hidden">Vizion</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-2 text-muted-foreground min-w-0">
          <Store className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm truncate">
            {branchName || 'Restaurant'}
          </span>
        </div>
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
      </div>
    </div>
  )
}