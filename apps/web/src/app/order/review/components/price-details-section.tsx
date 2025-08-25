"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  category_id?: string
}

interface CampaignDiscount {
  code: string
  discountAmount: number
  campaignType: 'percentage' | 'fixed_amount'
  campaignValue: number
}

interface PriceDetailsSectionProps {
  items: CartItem[]
  language: string
  branchId?: string
}

export function PriceDetailsSection({ items, language, branchId = '550e8400-e29b-41d4-a716-446655440002' }: PriceDetailsSectionProps) {
  const [campaignCode, setCampaignCode] = useState('')
  const [appliedCampaign, setAppliedCampaign] = useState<CampaignDiscount | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Calculate dynamic values
  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  // Calculate discount
  const discountAmount = appliedCampaign?.discountAmount || 0
  const subtotalAfterDiscount = itemsTotal - discountAmount
  
  // Quebec taxes: GST (5%) + QST (9.975%) = ~15%
  // GST = Goods and Services Tax (Federal tax - 5%)
  // QST = Quebec Sales Tax (Provincial tax - 9.975%)
  // These are calculated on the subtotal (after any discounts)
  const gstRate = 0.05
  const qstRate = 0.09975
  const gst = subtotalAfterDiscount * gstRate
  const qst = subtotalAfterDiscount * qstRate
  
  const finalTotal = subtotalAfterDiscount + gst + qst

  // Apply campaign code
  const applyCampaignCode = async () => {
    if (!campaignCode.trim()) return

    setIsValidating(true)
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
        setAppliedCampaign({
          code: campaignCode.toUpperCase(),
          discountAmount: result.data.discountAmount,
          campaignType: result.data.campaign.type,
          campaignValue: result.data.campaign.value
        })
        setCampaignCode('')
        toast.success(language === 'fr' 
          ? `Code ${campaignCode.toUpperCase()} appliqué! Économie: ${result.data.discountAmount.toFixed(2)} $`
          : `Code ${campaignCode.toUpperCase()} applied! Savings: $${result.data.discountAmount.toFixed(2)}`
        )
      } else {
        toast.error(result.error?.message || (language === 'fr' ? 'Code invalide' : 'Invalid code'))
      }
    } catch (error) {
      console.error('Campaign validation error:', error)
      toast.error(language === 'fr' ? 'Erreur lors de la validation du code' : 'Error validating code')
    } finally {
      setIsValidating(false)
    }
  }

  // Remove applied campaign
  const removeCampaign = () => {
    setAppliedCampaign(null)
    toast.success(language === 'fr' ? 'Code supprimé' : 'Code removed')
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Price details
      </h3>
      
      {/* Campaign Code Input */}
      <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
        <Label className="text-sm font-medium text-foreground mb-2 block">
          {language === 'fr' ? 'Code promo' : 'Promo Code'}
        </Label>
        
        {!appliedCampaign ? (
          <div className="flex gap-2">
            <Input
              placeholder={language === 'fr' ? 'Entrez le code' : 'Enter code'}
              value={campaignCode}
              onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && applyCampaignCode()}
              className="flex-1"
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
        ) : (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">{appliedCampaign.code}</span>
              <span className="text-sm text-green-600">
                {appliedCampaign.campaignType === 'percentage' 
                  ? `${appliedCampaign.campaignValue}% off`
                  : `$${appliedCampaign.campaignValue} off`
                }
              </span>
            </div>
            <Button
              onClick={removeCampaign}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-800 hover:bg-green-100 p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          <span className="text-foreground">
            {language === 'fr' ? `${itemsTotal.toFixed(2)} $` : `$${itemsTotal.toFixed(2)}`}
          </span>
        </div>
        
        {/* Campaign Discount */}
        {appliedCampaign && discountAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-600" />
              {appliedCampaign.code}
            </span>
            <span className="text-green-600 font-medium">
              {language === 'fr' ? `-${discountAmount.toFixed(2)} $` : `-$${discountAmount.toFixed(2)}`}
            </span>
          </div>
        )}
        
        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">
              {language === 'fr' ? `${subtotalAfterDiscount.toFixed(2)} $` : `$${subtotalAfterDiscount.toFixed(2)}`}
            </span>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">GST</span>
            <span className="text-foreground">
              {language === 'fr' ? `${gst.toFixed(2)} $` : `$${gst.toFixed(2)}`}
            </span>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">QST</span>
            <span className="text-foreground">
              {language === 'fr' ? `${qst.toFixed(2)} $` : `$${qst.toFixed(2)}`}
            </span>
          </div>
        </div>
        
        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Total</span>
            {appliedCampaign && discountAmount > 0 ? (
              <div className="text-right">
                <span className="text-sm text-muted-foreground line-through mr-2">
                  {language === 'fr' ? `${(finalTotal + discountAmount).toFixed(2)} $` : `$${(finalTotal + discountAmount).toFixed(2)}`}
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {language === 'fr' ? `${finalTotal.toFixed(2)} $` : `$${finalTotal.toFixed(2)}`}
                </span>
              </div>
            ) : (
              <span className="text-lg font-semibold text-foreground">
                {language === 'fr' ? `${finalTotal.toFixed(2)} $` : `$${finalTotal.toFixed(2)}`}
              </span>
            )}
          </div>
          {appliedCampaign && discountAmount > 0 && (
            <p className="text-sm text-green-600 text-right mt-1">
              {language === 'fr' 
                ? `Vous économisez ${discountAmount.toFixed(2)} $` 
                : `You saved $${discountAmount.toFixed(2)}`
              }
            </p>
          )}
        </div>
      </div>
    </div>
  )
}