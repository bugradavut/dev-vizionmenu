"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Home, Building, Building2, Hotel, MapPin, Package } from 'lucide-react'

type OrderType = 'dine_in' | 'takeaway'
type AddressType = 'home' | 'apartment' | 'office' | 'hotel' | 'other'

interface CustomerInfo {
  name: string
  phone: string
  email: string
  orderType: OrderType
}

interface DeliveryAddress {
  type: AddressType
  streetNumber: string
  streetName: string
  unitNumber?: string
  city: string
  province: string
  postalCode: string
  buzzerCode?: string
  deliveryInstructions: string
}

export function CustomerInformationSection() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    orderType: 'takeaway'
  })

  const [address, setAddress] = useState<DeliveryAddress>({
    type: 'home',
    streetNumber: '',
    streetName: '',
    unitNumber: '',
    city: '',
    province: 'QC',
    postalCode: '',
    buzzerCode: '',
    deliveryInstructions: ''
  })

  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const orderTypes = [
    { value: 'takeaway', label: 'To take away', icon: Package },
    { value: 'dine_in', label: 'Dine in', icon: Package },
  ]

  const addressTypes = [
    { value: 'home', label: 'Home/House', icon: Home },
    { value: 'apartment', label: 'Apartment/Condo', icon: Building },
    { value: 'office', label: 'Office/Commercial', icon: Building2 },
    { value: 'hotel', label: 'Hotel/Temporary', icon: Hotel },
    { value: 'other', label: 'Other', icon: MapPin },
  ]

  const canadianProvinces = [
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'ON', label: 'Ontario' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'QC', label: 'Quebec' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'YT', label: 'Yukon' },
  ]

  const handleCustomerChange = (field: keyof CustomerInfo, value: string | OrderType) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Customer Information
      </h2>
      
      {/* Customer Details */}
      <div className="space-y-4 mb-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="customer-name" className="text-sm font-medium">
            Full Name *
          </Label>
          <Input
            id="customer-name"
            type="text"
            placeholder="Enter your full name"
            value={customerInfo.name}
            onChange={(e) => handleCustomerChange('name', e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="customer-phone" className="text-sm font-medium">
            Phone Number *
          </Label>
          <Input
            id="customer-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={customerInfo.phone}
            onChange={(e) => handleCustomerChange('phone', e.target.value)}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="customer-email" className="text-sm font-medium">
            Email Address (Optional)
          </Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="your.email@example.com"
            value={customerInfo.email}
            onChange={(e) => handleCustomerChange('email', e.target.value)}
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

      {/* Order Type Selection */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Order Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {orderTypes.map((type) => {
            const IconComponent = type.icon
            return (
              <Button
                key={type.value}
                variant={customerInfo.orderType === type.value ? 'default' : 'outline'}
                onClick={() => handleCustomerChange('orderType', type.value as OrderType)}
                className="flex items-center gap-2 h-auto py-3"
              >
                <IconComponent className="h-4 w-4" />
                <span>{type.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Delivery Address (only for takeaway) */}
      {customerInfo.orderType === 'takeaway' && (
        <>
          <div className="border-t border-border pt-6">
            <h3 className="text-md font-semibold text-foreground mb-4">
              Delivery Address
            </h3>
            
            {/* Address Type Selection */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-3 block">Address Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {addressTypes.map((type) => {
                  const IconComponent = type.icon
                  return (
                    <Button
                      key={type.value}
                      variant={address.type === type.value ? 'default' : 'outline'}
                      onClick={() => handleAddressChange('type', type.value)}
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <IconComponent className="h-3 w-3" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Address Fields */}
            <div className="space-y-4">
              {/* Street Address */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="street-number" className="text-sm font-medium">
                    Street Number *
                  </Label>
                  <Input
                    id="street-number"
                    placeholder="123"
                    value={address.streetNumber}
                    onChange={(e) => handleAddressChange('streetNumber', e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street-name" className="text-sm font-medium">
                    Street Name *
                  </Label>
                  <Input
                    id="street-name"
                    placeholder="Main Street"
                    value={address.streetName}
                    onChange={(e) => handleAddressChange('streetName', e.target.value)}
                  />
                </div>
              </div>

              {/* Unit Number (for apartments/offices) */}
              {(address.type === 'apartment' || address.type === 'office') && (
                <div className="space-y-2">
                  <Label htmlFor="unit-number" className="text-sm font-medium">
                    {address.type === 'apartment' ? 'Apartment/Unit Number' : 'Suite/Office Number'} *
                  </Label>
                  <Input
                    id="unit-number"
                    placeholder={address.type === 'apartment' ? "Apt 4B" : "Suite 201"}
                    value={address.unitNumber}
                    onChange={(e) => handleAddressChange('unitNumber', e.target.value)}
                  />
                </div>
              )}

              {/* Buzzer Code (for apartments) */}
              {address.type === 'apartment' && (
                <div className="space-y-2">
                  <Label htmlFor="buzzer-code" className="text-sm font-medium">
                    Buzzer Code (Optional)
                  </Label>
                  <Input
                    id="buzzer-code"
                    placeholder="1234 or #4B"
                    value={address.buzzerCode}
                    onChange={(e) => handleAddressChange('buzzerCode', e.target.value)}
                  />
                </div>
              )}

              {/* City, Province, Postal Code */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">
                    City *
                  </Label>
                  <Input
                    id="city"
                    placeholder="Montreal"
                    value={address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province" className="text-sm font-medium">
                    Province *
                  </Label>
                  <Select value={address.province} onValueChange={(value) => handleAddressChange('province', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {canadianProvinces.map((province) => (
                        <SelectItem key={province.value} value={province.value}>
                          {province.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal-code" className="text-sm font-medium">
                    Postal Code *
                  </Label>
                  <Input
                    id="postal-code"
                    placeholder="H1A 1A1"
                    value={address.postalCode}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value.toUpperCase())}
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Delivery Instructions */}
              <div className="space-y-2">
                <Label htmlFor="delivery-instructions" className="text-sm font-medium">
                  Delivery Instructions (Optional)
                </Label>
                <Input
                  id="delivery-instructions"
                  placeholder="Ring doorbell, leave at door, etc."
                  value={address.deliveryInstructions}
                  onChange={(e) => handleAddressChange('deliveryInstructions', e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}