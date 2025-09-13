"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/language-context'
import type { Campaign } from '@/types/campaign'
import { getCampaignStatus, CampaignStatus } from '@/types/campaign'

interface FilterTabsProps {
  campaigns: Campaign[]
  activeFilter: CampaignStatus
  onFilterChange: (filter: CampaignStatus) => void
}

export const CampaignFilterTabs: React.FC<FilterTabsProps> = ({
  campaigns,
  activeFilter,
  onFilterChange
}) => {
  const { language } = useLanguage()

  // Calculate counts for each filter
  const counts = {
    all: campaigns.length,
    active: campaigns.filter(c => getCampaignStatus(c) === CampaignStatus.ACTIVE).length,
    expired: campaigns.filter(c => getCampaignStatus(c) === CampaignStatus.EXPIRED).length,
    inactive: campaigns.filter(c => getCampaignStatus(c) === CampaignStatus.INACTIVE).length
  }

  const filterTabs = [
    {
      key: CampaignStatus.ALL,
      label: language === 'fr' ? 'Toutes les campagnes' : 'All Campaigns',
      count: counts.all,
      color: 'default'
    },
    {
      key: CampaignStatus.ACTIVE,
      label: language === 'fr' ? 'Actives' : 'Active',
      count: counts.active,
      color: 'green'
    },
    {
      key: CampaignStatus.EXPIRED,
      label: language === 'fr' ? 'Expirées' : 'Expired',
      count: counts.expired,
      color: 'red'
    },
    {
      key: CampaignStatus.INACTIVE,
      label: language === 'fr' ? 'Inactives' : 'Inactive',
      count: counts.inactive,
      color: 'gray'
    }
  ]

  const getTabStyles = (isActive: boolean, color: string) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 text-sm font-medium"
    
    if (isActive) {
      switch (color) {
        case 'green':
          return `${baseClasses} bg-green-50 text-green-700 border-green-200 hover:bg-green-100`
        case 'red':
          return `${baseClasses} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`
        case 'gray':
          return `${baseClasses} bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100`
        default:
          return `${baseClasses} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`
      }
    }
    
    return `${baseClasses} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-700`
  }

  const getBadgeStyles = (isActive: boolean, color: string) => {
    if (isActive) {
      switch (color) {
        case 'green':
          return 'bg-green-100 text-green-800'
        case 'red':
          return 'bg-red-100 text-red-800'
        case 'gray':
          return 'bg-gray-100 text-gray-800'
        default:
          return 'bg-blue-100 text-blue-800'
      }
    }
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3">
        {filterTabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => onFilterChange(tab.key)}
            className={getTabStyles(activeFilter === tab.key, tab.color)}
          >
            <span>{tab.label}</span>
            <Badge
              variant="secondary"
              className={`${getBadgeStyles(activeFilter === tab.key, tab.color)} text-xs px-2 py-0.5`}
            >
              {tab.count}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  )
}