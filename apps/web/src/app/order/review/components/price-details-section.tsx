"use client"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface PriceDetailsSectionProps {
  items: CartItem[]
  language: string
}

export function PriceDetailsSection({ items, language }: PriceDetailsSectionProps) {
  // Calculate dynamic values
  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  // Promotion (TODO: Will be implemented later)
  // const promotionDiscount = itemsTotal * 0.1
  // const subtotalAfterDiscount = itemsTotal - promotionDiscount
  const subtotalAfterDiscount = itemsTotal // No promotion for now
  
  // Quebec taxes: GST (5%) + QST (9.975%) = ~15%
  // GST = Goods and Services Tax (Federal tax - 5%)
  // QST = Quebec Sales Tax (Provincial tax - 9.975%)
  // These are calculated on the subtotal (after any discounts)
  const gstRate = 0.05
  const qstRate = 0.09975
  const gst = subtotalAfterDiscount * gstRate
  const qst = subtotalAfterDiscount * qstRate
  
  const finalTotal = subtotalAfterDiscount + gst + qst

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
        
        {/* TODO: Promotions will be implemented later
        {promotionDiscount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-foreground">PROMOTIONS</span>
            <span className="text-green-600">
              {language === 'fr' ? `-${promotionDiscount.toFixed(2)} $` : `-$${promotionDiscount.toFixed(2)}`}
            </span>
          </div>
        )}
        */}
        
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
            {/* TODO: When promotions are implemented, show original price crossed out
            <div className="text-right">
              <span className="text-sm text-muted-foreground line-through mr-2">
                {language === 'fr' ? `${originalTotal.toFixed(2)} $` : `$${originalTotal.toFixed(2)}`}
              </span>
              <span className="text-lg font-semibold text-foreground">
                {language === 'fr' ? `${finalTotal.toFixed(2)} $` : `$${finalTotal.toFixed(2)}`}
              </span>
            </div>
            */}
            <span className="text-lg font-semibold text-foreground">
              {language === 'fr' ? `${finalTotal.toFixed(2)} $` : `$${finalTotal.toFixed(2)}`}
            </span>
          </div>
          {/* TODO: When promotions are implemented, show savings message
          <p className="text-sm text-green-600 text-right mt-1">
            You saved {language === 'fr' ? `${promotionDiscount.toFixed(2)} $` : `$${promotionDiscount.toFixed(2)}`}
          </p>
          */}
        </div>
      </div>
    </div>
  )
}