"use client"

import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'

interface OrderDetailsSectionProps {
  orderType: 'dine_in' | 'takeaway'
  onOrderTypeChange: (type: 'dine_in' | 'takeaway') => void
}

export function OrderDetailsSection({ orderType, onOrderTypeChange }: OrderDetailsSectionProps) {

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Order details
        </h2>
        <Button variant="link" className="text-primary p-0 h-auto">
          modify
        </Button>
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <Package className="h-5 w-5 text-muted-foreground" />
        <span className="text-foreground font-medium">
          {orderType === 'takeaway' ? 'To take away' : 'Dine in'}
        </span>
        <Button 
          variant="link" 
          className="text-primary p-0 h-auto ml-auto"
          onClick={() => onOrderTypeChange(orderType === 'takeaway' ? 'dine_in' : 'takeaway')}
        >
          Change
        </Button>
      </div>

      {/* Restaurant info will be added here */}
      <div className="text-sm text-muted-foreground mb-4">
        <p>Restaurant Name</p>
        <p>Restaurant Address</p>
        <p>Ready to be picked up around 14:59</p>
      </div>
    </div>
  )
}