"use client"

import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useLanguage } from '@/contexts/language-context'
import { campaignsService } from '@/services/campaigns.service'
import type { Campaign } from '@/types/campaign'

interface DeleteCampaignDialogProps {
  campaign: Campaign | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteCampaignDialog({ campaign, open, onOpenChange, onSuccess }: DeleteCampaignDialogProps) {
  const { language } = useLanguage()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!campaign) return
    
    setIsDeleting(true)
    try {
      await campaignsService.deleteCampaign(campaign.id)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Delete campaign error:', error)
      toast.error(error instanceof Error ? error.message : (language === 'fr' ? 'Erreur lors de la suppression' : 'Failed to delete campaign'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (!campaign) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="flex flex-row items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <AlertDialogTitle>
              {language === 'fr' ? 'Supprimer la campagne' : 'Delete Campaign'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? `Êtes-vous sûr de vouloir supprimer la campagne "${campaign.code}" ? Cette action ne peut pas être annulée.`
                : `Are you sure you want to delete the campaign "${campaign.code}"? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {language === 'fr' ? 'Suppression...' : 'Deleting...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                {language === 'fr' ? 'Supprimer' : 'Delete'}
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}