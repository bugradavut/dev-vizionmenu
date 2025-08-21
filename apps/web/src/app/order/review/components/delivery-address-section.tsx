"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Home, Building, Building2, Hotel, MapPin } from 'lucide-react'

type AddressType = 'home' | 'apartment' | 'office' | 'hotel' | 'other'

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

export function DeliveryAddressSection() {
  const [addressType, setAddressType] = useState<AddressType>('home')
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

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (type: AddressType) => {
    setAddressType(type)
    setAddress(prev => ({ ...prev, type }))
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Delivery Address
      </h3>
      
      {/* Address Type Selection */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Address Type</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {addressTypes.map((type) => {
            const IconComponent = type.icon
            return (
              <Button
                key={type.value}
                variant={addressType === type.value ? 'default' : 'outline'}
                onClick={() => handleTypeChange(type.value as AddressType)}
                className="flex flex-col items-center gap-2 h-auto py-3"
              >
                <IconComponent className="h-4 w-4" />
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
        {(addressType === 'apartment' || addressType === 'office') && (
          <div className="space-y-2">
            <Label htmlFor="unit-number" className="text-sm font-medium">
              {addressType === 'apartment' ? 'Apartment/Unit Number' : 'Suite/Office Number'} *
            </Label>
            <Input
              id="unit-number"
              placeholder={addressType === 'apartment' ? "Apt 4B" : "Suite 201"}
              value={address.unitNumber}
              onChange={(e) => handleAddressChange('unitNumber', e.target.value)}
            />
          </div>
        )}

        {/* Buzzer Code (for apartments) */}
        {addressType === 'apartment' && (
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
  )
}