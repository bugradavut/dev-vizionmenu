"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tag, X, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  category_id?: string
}

interface CampaignDiscount {
  id: string
  code: string
  discountAmount: number
  campaignType: 'percentage' | 'fixed_amount'
  campaignValue: number
}

interface PromoCodeSectionProps {
  items: CartItem[]
  language: string
  branchId?: string
  onDiscountChange: (discount: CampaignDiscount | null) => void
}

export function PromoCodeSection({ items, language, branchId = '550e8400-e29b-41d4-a716-446655440002', onDiscountChange }: PromoCodeSectionProps) {
  const [campaignCode, setCampaignCode] = useState('')
  const [appliedCampaign, setAppliedCampaign] = useState<CampaignDiscount | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate items total
  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // Apply campaign code
  const applyCampaignCode = async () => {
    if (!campaignCode.trim()) return

    setIsValidating(true)
    setError(null)
    
    try {
      // Get unique categories from items
      const categories = [...new Set(items.map(item => item.category_id || ''))].filter(Boolean)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/campaigns/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: campaignCode.toUpperCase(),
          branchId: branchId,
          orderTotal: itemsTotal,
          categories: categories
        })
      })

      const result = await response.json()
      
      if (response.ok && result.data) {
        const discount = {
          id: result.data.campaign.id,
          code: campaignCode.toUpperCase(),
          discountAmount: result.data.discountAmount,
          campaignType: result.data.campaign.type,
          campaignValue: result.data.campaign.value
        }
        setAppliedCampaign(discount)
        onDiscountChange(discount)
        setCampaignCode('')
        setError(null)
        toast.success(language === 'fr' 
          ? `Code ${campaignCode.toUpperCase()} appliqué! Économie: ${result.data.discountAmount.toFixed(2)} $`
          : `Code ${campaignCode.toUpperCase()} applied! Savings: $${result.data.discountAmount.toFixed(2)}`
        )
      } else {
        const errorMessage = result.error?.message || (language === 'fr' ? 'Code promo invalide' : 'Invalid promo code')
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Campaign validation error:', error)
      const errorMessage = language === 'fr' ? 'Erreur lors de la validation du code' : 'Error validating code'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsValidating(false)
    }
  }

  // Remove applied campaign
  const removeCampaign = () => {
    setAppliedCampaign(null)
    onDiscountChange(null)
    setError(null)
    toast.success(language === 'fr' ? 'Code supprimé' : 'Code removed')
  }

  // Clear error when user starts typing
  const handleCodeChange = (value: string) => {
    setCampaignCode(value.toUpperCase())
    if (error) {
      setError(null)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {language === 'fr' ? 'Code promo' : 'Promo Code'}
      </h3>
      
      <div className="space-y-4">
        {!appliedCampaign ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              {language === 'fr' ? 'Avez-vous un code promo?' : 'Have a promo code?'}
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={language === 'fr' ? 'Entrez le code' : 'Enter code'}
                  value={campaignCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyCampaignCode()}
                  className={`flex-1 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                <Button
                  onClick={applyCampaignCode}
                  disabled={!campaignCode.trim() || isValidating}
                  size="sm"
                  className="px-4"
                >
                  {isValidating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Tag className="w-4 h-4 mr-1" />
                      {language === 'fr' ? 'Appliquer' : 'Apply'}
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              {language === 'fr' ? 'Code appliqué' : 'Applied code'}
            </Label>
            
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-900">{appliedCampaign.code}</span>
                    <span className="text-sm text-green-600">
                      {appliedCampaign.campaignType === 'percentage' 
                        ? `${appliedCampaign.campaignValue}% off`
                        : `$${appliedCampaign.campaignValue} off`
                      }
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    {language === 'fr' 
                      ? `Économie: ${appliedCampaign.discountAmount.toFixed(2)} $`
                      : `Savings: $${appliedCampaign.discountAmount.toFixed(2)}`
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={removeCampaign}
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-800 hover:bg-green-100 p-1 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}