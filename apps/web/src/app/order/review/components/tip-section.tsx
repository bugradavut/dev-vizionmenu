"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TipSection() {
  const [selectedTip, setSelectedTip] = useState<'none' | '10' | '15' | '18' | 'other'>('none')
  const [customTip, setCustomTip] = useState('')
  
  const subtotal = 24.75 // This should come from props
  
  const calculateTip = (percentage: number) => {
    return (subtotal * percentage / 100).toFixed(2)
  }

  const tipOptions = [
    { id: 'none', label: 'None', amount: '0.00' },
    { id: '10', label: '10%', amount: calculateTip(10) },
    { id: '15', label: '15%', amount: calculateTip(15) },
    { id: '18', label: '18%', amount: calculateTip(18) },
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Add a tip
      </h3>
      
      <div className="grid grid-cols-4 gap-3 mb-4">
        {tipOptions.map((option) => (
          <Button
            key={option.id}
            variant={selectedTip === option.id ? 'default' : 'outline'}
            onClick={() => {
              setSelectedTip(option.id as typeof selectedTip)
              setCustomTip('')
            }}
            className="flex flex-col h-auto py-3"
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-xs">${option.amount}</span>
          </Button>
        ))}
      </div>

      <div className="mb-4">
        <Button
          variant={selectedTip === 'other' ? 'default' : 'outline'}
          onClick={() => setSelectedTip('other')}
          className="w-full mb-2"
        >
          Other
        </Button>
        {selectedTip === 'other' && (
          <Input
            type="number"
            placeholder="Enter custom tip amount"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            className="w-full"
          />
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        100% of the tip supports the restaurant and its staff who prepare and pack your order.
      </p>
    </div>
  )
}