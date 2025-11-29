"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TipSectionProps {
  subtotal: number
  onTipChange?: (tipAmount: number, tipType: 'percentage' | 'fixed', tipValue: number) => void
}

export function TipSection({ subtotal, onTipChange }: TipSectionProps) {
  const [selectedTip, setSelectedTip] = useState<'15' | '18' | '20' | 'custom_percent' | 'fixed_amount'>('15')
  const [customTip, setCustomTip] = useState('')

  // 🔧 FIX: Recalculate tip when subtotal changes
  useEffect(() => {
    // Recalculate tip based on current subtotal and selected option
    let tipAmount = 0
    const tipType: 'percentage' | 'fixed' = selectedTip === 'fixed_amount' ? 'fixed' : 'percentage'
    let tipValue = 0

    switch (selectedTip) {
      case '15':
        tipAmount = parseFloat(calculateTip(15))
        tipValue = 15
        break
      case '18':
        tipAmount = parseFloat(calculateTip(18))
        tipValue = 18
        break
      case '20':
        tipAmount = parseFloat(calculateTip(20))
        tipValue = 20
        break
      case 'custom_percent':
        if (customTip) {
          const percentValue = parseFloat(customTip)
          if (!isNaN(percentValue) && percentValue > 0) {
            const limitedValue = Math.min(Math.max(percentValue, 0), 100)
            tipAmount = subtotal * limitedValue / 100
            tipValue = limitedValue
          }
        }
        break
      case 'fixed_amount':
        if (customTip) {
          const fixedValue = parseFloat(customTip)
          if (!isNaN(fixedValue) && fixedValue > 0) {
            const limitedValue = Math.min(fixedValue, subtotal * 5)
            tipAmount = limitedValue
            tipValue = limitedValue
          }
        }
        break
    }

    onTipChange?.(tipAmount, tipType, tipValue)
  }, [subtotal, selectedTip, customTip]) // 🔧 FIX: Removed onTipChange from dependencies to prevent infinite loop
  
  const calculateTip = (percentage: number) => {
    return (subtotal * percentage / 100).toFixed(2)
  }

  const calculateCustomTip = () => {
    const value = parseFloat(customTip)
    if (isNaN(value) || value <= 0) return '0.00'
    
    if (selectedTip === 'custom_percent') {
      return (subtotal * value / 100).toFixed(2)
    } else if (selectedTip === 'fixed_amount') {
      return value.toFixed(2)
    }
    return '0.00'
  }

  const handleTipSelection = (tipId: typeof selectedTip) => {
    setSelectedTip(tipId)
    setCustomTip('')

    // Calculate tip amount for callback
    let tipAmount = 0
    const tipType: 'percentage' | 'fixed' = 'percentage'
    let tipValue = 0

    switch (tipId) {
      case '15':
        tipAmount = parseFloat(calculateTip(15))
        tipValue = 15
        break
      case '18':
        tipAmount = parseFloat(calculateTip(18))
        tipValue = 18
        break
      case '20':
        tipAmount = parseFloat(calculateTip(20))
        tipValue = 20
        break
    }

    onTipChange?.(tipAmount, tipType, tipValue)
  }

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value)
    
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      onTipChange?.(0, selectedTip === 'custom_percent' ? 'percentage' : 'fixed', 0)
      return
    }

    let tipAmount = 0
    const tipType = selectedTip === 'custom_percent' ? 'percentage' : 'fixed'

    if (selectedTip === 'custom_percent') {
      // Limit percentage to reasonable range (0-100%)
      const limitedValue = Math.min(Math.max(numValue, 0), 100)
      tipAmount = subtotal * limitedValue / 100
      onTipChange?.(tipAmount, tipType, limitedValue)
    } else if (selectedTip === 'fixed_amount') {
      // Limit fixed amount to reasonable range (max 5x subtotal)
      const limitedValue = Math.min(numValue, subtotal * 5)
      tipAmount = limitedValue
      onTipChange?.(tipAmount, tipType, limitedValue)
    }
  }

  const tipOptions = [
    { id: '15', label: '15%', amount: calculateTip(15) },
    { id: '18', label: '18%', amount: calculateTip(18) },
    { id: '20', label: '20%', amount: calculateTip(20) },
  ]

  const customOptions = [
    { id: 'custom_percent', label: 'Custom', symbol: '%' },
    { id: 'fixed_amount', label: 'Fixed', symbol: '$' }
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Add a tip
      </h3>
      
      {/* All tip options in one row - responsive */}
      <div className="grid grid-cols-6 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
        {tipOptions.map((option) => (
          <Button
            key={option.id}
            variant={selectedTip === option.id ? 'default' : 'outline'}
            onClick={() => handleTipSelection(option.id as typeof selectedTip)}
            className={`col-span-2 sm:col-span-1 flex flex-col h-auto py-2 sm:py-3 rounded-lg text-xs sm:text-sm ${
              selectedTip === option.id
                ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922]'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <span className="font-bold">{option.label}</span>
            <span className="text-xs">${option.amount}</span>
          </Button>
        ))}
        {customOptions.map((option) => (
          <Button
            key={option.id}
            variant={selectedTip === option.id ? 'default' : 'outline'}
            onClick={() => handleTipSelection(option.id as typeof selectedTip)}
            className={`col-span-3 sm:col-span-1 flex flex-col h-auto py-2 sm:py-3 rounded-lg text-xs sm:text-sm ${
              selectedTip === option.id
                ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922]'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <span className="font-bold">{option.label}</span>
            <span className="text-xs">{option.symbol}</span>
          </Button>
        ))}
      </div>

      {/* Custom input for percentage or fixed amount */}
      {(selectedTip === 'custom_percent' || selectedTip === 'fixed_amount') && (
        <div className="mb-4 space-y-2">
          <Input
            type="number"
            placeholder={
              selectedTip === 'custom_percent' 
                ? "Enter percentage (e.g., 20 for 20%)"
                : "Enter dollar amount (e.g., 5.00)"
            }
            value={customTip}
            onChange={(e) => handleCustomTipChange(e.target.value)}
            min="0"
            max={selectedTip === 'custom_percent' ? "100" : undefined}
            step={selectedTip === 'custom_percent' ? "1" : "0.01"}
            className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg w-full"
          />
          {customTip && (
            <div className="text-sm text-gray-600">
              Tip amount: <span className="font-semibold text-[#FF6922]">${calculateCustomTip()}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        100% of the tip supports the restaurant and its staff who prepare and pack your order.
      </p>
    </div>
  )
}