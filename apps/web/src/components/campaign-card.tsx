"use client"

import React, { useState } from 'react'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Pencil, 
  Trash2, 
  ShieldX, 
  Check,
  Percent,
  DollarSign,
  Calendar,
  Target
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import type { Campaign } from '@/types/campaign'

interface CampaignCardProps {
  campaign: Campaign
  onEdit: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
  onToggleStatus: (campaignId: string) => void
  isLoading?: boolean
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onEdit,
  onDelete,
  onToggleStatus,
  isLoading = false
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isToggling, setIsToggling] = useState(false)

  const handleToggleStatus = async () => {
    setIsToggling(true)
    try {
      await onToggleStatus(campaign.id)
    } catch (error) {
      console.error('Failed to toggle status:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleEdit = () => {
    onEdit(campaign)
  }

  const handleDelete = () => {
    onDelete(campaign)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')
  }

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`
    } else {
      return language === 'fr' ? `${value.toFixed(2)} $` : `$${value.toFixed(2)}`
    }
  }

  const isExpired = new Date(campaign.valid_until) < new Date()

  return (
    <Card className={`${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Top section with icon, info, and badge */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Campaign Icon */}
          <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 ${
            campaign.type === 'percentage' 
              ? 'bg-blue-50 dark:bg-blue-900/20' 
              : 'bg-green-50 dark:bg-green-900/20'
          }`}>
            {campaign.type === 'percentage' ? (
              <Percent className="w-8 h-8 text-blue-500" />
            ) : (
              <DollarSign className="w-8 h-8 text-green-500" />
            )}
          </div>
          
          {/* Campaign Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg font-bold tracking-wide">
                {campaign.code}
              </CardTitle>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                campaign.type === 'percentage' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}>
                {formatDiscount(campaign.type, campaign.value)}
              </div>
            </div>
            
            <CardDescription className="text-sm mb-2">
              {campaign.type === 'percentage' ? t.campaigns.percentage : t.campaigns.fixedAmount}
            </CardDescription>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{language === 'fr' ? 'Jusqu\'au' : 'Until'} {formatDate(campaign.valid_until)}</span>
              </div>
              {campaign.applicable_categories && (
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>{language === 'fr' ? 'Catégories spécifiques' : 'Specific categories'}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Status Badge */}
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant={campaign.is_active && !isExpired ? "default" : "secondary"}
              className={
                campaign.is_active && !isExpired
                  ? 'text-green-700 border-green-300 bg-green-100' 
                  : isExpired
                  ? 'text-red-600 border-red-200 bg-red-50'
                  : 'text-gray-600 border-gray-200 bg-gray-50'
              }
            >
              {isExpired 
                ? (language === 'fr' ? 'Expiré' : 'Expired')
                : campaign.is_active 
                ? (language === 'fr' ? 'Actif' : 'Active')
                : (language === 'fr' ? 'Inactif' : 'Inactive')
              }
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Bottom action buttons */}
      <div className="border-t border-gray-200 dark:border-gray-700 flex">
        <Button 
          variant="ghost" 
          onClick={handleEdit}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Pencil className="w-4 h-4" />
          {language === 'fr' ? 'Modifier' : 'Edit'}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleToggleStatus}
          disabled={isToggling || isExpired}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
        >
          {campaign.is_active ? (
            <>
              <ShieldX className="w-4 h-4" />
              {language === 'fr' ? 'Désactiver' : 'Deactivate'}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {language === 'fr' ? 'Activer' : 'Activate'}
            </>
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleDelete}
          className="flex-1 rounded-none h-12 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {language === 'fr' ? 'Supprimer' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}