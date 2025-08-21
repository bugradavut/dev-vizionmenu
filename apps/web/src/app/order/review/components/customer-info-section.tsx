"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CustomerInfo {
  name: string
  phone: string
  email: string
}

export function CustomerInfoSection() {
  
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: ''
  })

  const [errors, setErrors] = useState<Partial<CustomerInfo>>({})

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }


  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Customer Information
      </h2>
      
      <div className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="customer-name" className="text-sm font-medium">
            Full Name *
          </Label>
          <Input
            id="customer-name"
            type="text"
            placeholder="Enter your full name"
            value={customerInfo.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="customer-phone" className="text-sm font-medium">
            Phone Number *
          </Label>
          <Input
            id="customer-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={customerInfo.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="customer-email" className="text-sm font-medium">
            Email Address (Optional)
          </Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="your.email@example.com"
            value={customerInfo.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We&apos;ll use this to send you order updates
          </p>
        </div>

      </div>
    </div>
  )
}