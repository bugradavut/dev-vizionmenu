"use client"

interface PriceDetailsSectionProps {
  subtotal: number
  language: string
}

export function PriceDetailsSection({ subtotal, language }: PriceDetailsSectionProps) {
  const tax = subtotal * 0.13
  const total = subtotal + tax

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Price details
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-foreground">1 item</span>
          <span className="text-foreground">
            {language === 'fr' ? `${subtotal.toFixed(2)} $` : `$${subtotal.toFixed(2)}`}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-foreground">PROMOTIONS</span>
          <span className="text-green-600">
            {language === 'fr' ? `-${(subtotal * 0.1).toFixed(2)} $` : `-$${(subtotal * 0.1).toFixed(2)}`}
          </span>
        </div>
        
        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">
              {language === 'fr' ? `${(subtotal * 0.9).toFixed(2)} $` : `$${(subtotal * 0.9).toFixed(2)}`}
            </span>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">GST</span>
            <span className="text-foreground">
              {language === 'fr' ? `${(tax * 0.5).toFixed(2)} $` : `$${(tax * 0.5).toFixed(2)}`}
            </span>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">QST</span>
            <span className="text-foreground">
              {language === 'fr' ? `${(tax * 0.5).toFixed(2)} $` : `$${(tax * 0.5).toFixed(2)}`}
            </span>
          </div>
        </div>
        
        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Total</span>
            <div className="text-right">
              <span className="text-sm text-muted-foreground line-through mr-2">
                {language === 'fr' ? `${total.toFixed(2)} $` : `$${total.toFixed(2)}`}
              </span>
              <span className="text-lg font-semibold text-foreground">
                {language === 'fr' ? `${(total * 0.9).toFixed(2)} $` : `$${(total * 0.9).toFixed(2)}`}
              </span>
            </div>
          </div>
          <p className="text-sm text-green-600 text-right mt-1">
            You saved {language === 'fr' ? `${(total * 0.1).toFixed(2)} $` : `$${(total * 0.1).toFixed(2)}`}
          </p>
        </div>
      </div>
    </div>
  )
}