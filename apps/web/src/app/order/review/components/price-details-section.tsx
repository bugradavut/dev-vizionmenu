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

interface SelectedTip {
  amount: number
  type: 'percentage' | 'fixed'
  value: number
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
  baseDeliveryFee?: number
  freeDeliveryThreshold?: number
  isFreeDelivery?: boolean
  selectedTip?: SelectedTip | null
  userSource?: 'qr' | 'web'
}

export function PriceDetailsSection({ 
  items, 
  language, 
  appliedDiscount, 
  selectedOrderType, 
  minimumOrderAmount, 
  isMinimumOrderLoading, 
  isMinimumOrderMet,
  deliveryFee = 0,
  baseDeliveryFee = 0,
  freeDeliveryThreshold = 0,
  isFreeDelivery = false,
  selectedTip,
  userSource = 'web'
}: PriceDetailsSectionProps) {
  // Calculate dynamic values
  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  // Calculate discount
  const discountAmount = appliedDiscount?.discountAmount || 0
  const subtotalAfterDiscount = itemsTotal - discountAmount
  
  // Add delivery fee for delivery orders only (using calculated delivery fee)
  const applicableDeliveryFee = selectedOrderType === 'delivery' ? deliveryFee : 0
  const subtotalWithDelivery = subtotalAfterDiscount + applicableDeliveryFee

  // ✅ CANADA TAX FIX: Tips are NOT taxable - calculate taxes WITHOUT tip
  // Quebec taxes: GST (5%) + QST (9.975%) = ~15%
  // GST = Goods and Services Tax (Federal tax - 5%)
  // QST = Quebec Sales Tax (Provincial tax - 9.975%)
  const tipAmount = selectedTip?.amount || 0

  const gstRate = 0.05
  const qstRate = 0.09975
  const gst = subtotalWithDelivery * gstRate
  const qst = subtotalWithDelivery * qstRate

  // Final total: subtotal + taxes + tip (tip added AFTER taxes)
  const finalTotal = subtotalWithDelivery + gst + qst + tipAmount

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
        {selectedOrderType === 'delivery' && (
          <div className="flex justify-between items-center">
            <span className="text-foreground flex items-center gap-2">
              {language === 'fr' ? 'Frais de livraison' : 'Delivery fee'}
              {isFreeDelivery && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                  {language === 'fr' ? 'GRATUIT!' : 'FREE!'}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {isFreeDelivery && baseDeliveryFee > 0 && (
                <span className="text-muted-foreground line-through text-sm">
                  {language === 'fr' ? `${baseDeliveryFee.toFixed(2)} $` : `$${baseDeliveryFee.toFixed(2)}`}
                </span>
              )}
              <span className={`text-foreground ${isFreeDelivery ? 'text-green-600 font-medium' : ''}`}>
                {language === 'fr' ? `${applicableDeliveryFee.toFixed(2)} $` : `$${applicableDeliveryFee.toFixed(2)}`}
              </span>
            </div>
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
            <span className="text-muted-foreground">{language === 'fr' ? 'TPS' : 'GST'}</span>
            <span className="text-foreground">
              {language === 'fr' ? `${gst.toFixed(2)} $` : `$${gst.toFixed(2)}`}
            </span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">{language === 'fr' ? 'TVQ' : 'QST'}</span>
            <span className="text-foreground">
              {language === 'fr' ? `${qst.toFixed(2)} $` : `$${qst.toFixed(2)}`}
            </span>
          </div>

          {/* ✅ CANADA TAX FIX: Tip shown AFTER taxes (tip is NOT taxable) */}
          {selectedTip && tipAmount > 0 && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-foreground flex items-center gap-1">
                {language === 'fr' ? 'Pourboire' : 'Tip'}
                <span className="text-xs text-muted-foreground">
                  ({selectedTip.type === 'percentage'
                    ? `${selectedTip.value}%`
                    : language === 'fr' ? 'fixe' : 'fixed'
                  })
                </span>
              </span>
              <span className="text-foreground">
                {language === 'fr' ? `${tipAmount.toFixed(2)} $` : `$${tipAmount.toFixed(2)}`}
              </span>
            </div>
          )}
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
          {selectedOrderType === 'delivery' && !isMinimumOrderLoading && (minimumOrderAmount ?? 0) > 0 && !isMinimumOrderMet && (
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
                      ? `Articles alimentaires: ${subtotalAfterDiscount.toFixed(2)} $ / ${(minimumOrderAmount ?? 0).toFixed(2)} $ requis`
                      : `Food subtotal: $${subtotalAfterDiscount.toFixed(2)} / $${(minimumOrderAmount ?? 0).toFixed(2)} required`
                    }
                  </p>
                  <p className="text-red-700 mt-1">
                    {language === 'fr'
                      ? `Ajoutez ${((minimumOrderAmount ?? 0) - subtotalAfterDiscount).toFixed(2)} $ d'articles alimentaires pour qualifier pour la livraison`
                      : `Add $${((minimumOrderAmount ?? 0) - subtotalAfterDiscount).toFixed(2)} in food items to qualify for delivery`
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
          
          {/* ✅ NEW: Free delivery progress bar (web delivery only) - Show only when NOT qualified yet */}
          {userSource === 'web' && selectedOrderType === 'delivery' && freeDeliveryThreshold > 0 && subtotalAfterDiscount > 0 && !isFreeDelivery && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-blue-700">
                    {language === 'fr' 
                      ? `Gratuite à ${freeDeliveryThreshold.toFixed(2)} $`
                      : `Free delivery at $${freeDeliveryThreshold.toFixed(2)}`
                    }
                  </p>
                  <p className="text-sm text-blue-600">
                    {language === 'fr' 
                      ? `${(freeDeliveryThreshold - subtotalAfterDiscount).toFixed(2)} $ restant`
                      : `$${(freeDeliveryThreshold - subtotalAfterDiscount).toFixed(2)} to go`
                    }
                  </p>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((subtotalAfterDiscount / freeDeliveryThreshold) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}