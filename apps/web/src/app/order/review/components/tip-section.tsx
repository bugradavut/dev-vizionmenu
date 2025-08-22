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
      
      <div className="grid grid-cols-5 gap-3 mb-4">
        {tipOptions.map((option) => (
          <Button
            key={option.id}
            variant={selectedTip === option.id ? 'default' : 'outline'}
            onClick={() => {
              setSelectedTip(option.id as typeof selectedTip)
              setCustomTip('')
            }}
            className={`flex flex-col h-auto py-3 rounded-lg ${
              selectedTip === option.id
                ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922]'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <span className="font-bold">{option.label}</span>
            <span className="text-xs">${option.amount}</span>
          </Button>
        ))}
        
        <Button
          variant={selectedTip === 'other' ? 'default' : 'outline'}
          onClick={() => setSelectedTip('other')}
          className={`flex flex-col h-auto py-3 rounded-lg ${
            selectedTip === 'other'
              ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922]'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          <span className="font-bold">Other</span>
          <span className="text-xs">Custom</span>
        </Button>
      </div>

      {selectedTip === 'other' && (
        <div className="mb-4">
          <Input
            type="number"
            placeholder="Enter custom tip amount"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg w-full"
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        100% of the tip supports the restaurant and its staff who prepare and pack your order.
      </p>
    </div>
  )
}