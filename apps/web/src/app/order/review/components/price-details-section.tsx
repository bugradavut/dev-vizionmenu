"use client"

import { Tag, AlertTriangle } from 'lucide-react'

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
  appliedDiscount?: CampaignDiscount | null
  selectedOrderType?: 'takeaway' | 'delivery' | null
  minimumOrderAmount?: number
  isMinimumOrderLoading?: boolean
  isMinimumOrderMet?: boolean
  deliveryFee?: number
}

export function PriceDetailsSection({ 
  items, 
  language, 
  appliedDiscount, 
  selectedOrderType, 
  minimumOrderAmount, 
  isMinimumOrderLoading, 
  isMinimumOrderMet,
  deliveryFee = 0
}: PriceDetailsSectionProps) {
  // Calculate dynamic values
  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  // Calculate discount
  const discountAmount = appliedDiscount?.discountAmount || 0
  const subtotalAfterDiscount = itemsTotal - discountAmount
  
  // Add delivery fee for delivery orders only
  const applicableDeliveryFee = selectedOrderType === 'delivery' ? deliveryFee : 0
  
  // Quebec taxes: GST (5%) + QST (9.975%) = ~15%
  // GST = Goods and Services Tax (Federal tax - 5%)
  // QST = Quebec Sales Tax (Provincial tax - 9.975%)
  // These are calculated on the subtotal (after any discounts, including delivery fee)
  const subtotalWithDelivery = subtotalAfterDiscount + applicableDeliveryFee
  const gstRate = 0.05
  const qstRate = 0.09975
  const gst = subtotalWithDelivery * gstRate
  const qst = subtotalWithDelivery * qstRate
  
  const finalTotal = subtotalWithDelivery + gst + qst

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Price details
      </h3>
      
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
        {appliedDiscount && discountAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-600" />
              {appliedDiscount.code}
            </span>
            <span className="text-green-600 font-medium">
              {language === 'fr' ? `-${discountAmount.toFixed(2)} $` : `-$${discountAmount.toFixed(2)}`}
            </span>
          </div>
        )}
        
        {/* Delivery Fee */}
        {selectedOrderType === 'delivery' && applicableDeliveryFee > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-foreground">
              {language === 'fr' ? 'Frais de livraison' : 'Delivery fee'}
            </span>
            <span className="text-foreground">
              {language === 'fr' ? `${applicableDeliveryFee.toFixed(2)} $` : `$${applicableDeliveryFee.toFixed(2)}`}
            </span>
          </div>
        )}
        
        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">
              {language === 'fr' ? `${subtotalWithDelivery.toFixed(2)} $` : `$${subtotalWithDelivery.toFixed(2)}`}
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
            {appliedDiscount && discountAmount > 0 ? (
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
          {appliedDiscount && discountAmount > 0 && (
            <p className="text-sm text-green-600 text-right mt-1">
              {language === 'fr' 
                ? `Vous économisez ${discountAmount.toFixed(2)} $` 
                : `You saved $${discountAmount.toFixed(2)}`
              }
            </p>
          )}
          
          {/* Minimum Order Warning for Delivery Orders */}
          {selectedOrderType === 'delivery' && !isMinimumOrderLoading && minimumOrderAmount && minimumOrderAmount > 0 && !isMinimumOrderMet && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-red-800">
                    {language === 'fr' 
                      ? 'Minimum de livraison non atteint' 
                      : 'Delivery Minimum Not Met'
                    }
                  </p>
                  <p className="text-red-700 mt-1">
                    {language === 'fr' 
                      ? `Articles alimentaires: ${subtotalAfterDiscount.toFixed(2)} $ / ${minimumOrderAmount.toFixed(2)} $ requis`
                      : `Food subtotal: $${subtotalAfterDiscount.toFixed(2)} / $${minimumOrderAmount.toFixed(2)} required`
                    }
                  </p>
                  <p className="text-red-700 mt-1">
                    {language === 'fr' 
                      ? `Ajoutez ${(minimumOrderAmount - subtotalAfterDiscount).toFixed(2)} $ d'articles alimentaires pour qualifier pour la livraison`
                      : `Add $${(minimumOrderAmount - subtotalAfterDiscount).toFixed(2)} in food items to qualify for delivery`
                    }
                  </p>
                  <p className="text-red-600 text-xs mt-2 opacity-80">
                    {language === 'fr' 
                      ? 'Les frais de livraison et taxes sont calculés séparément'
                      : 'Delivery fees and taxes are calculated separately'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}