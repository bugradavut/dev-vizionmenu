"use client"

import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Home, Building, Building2, MapPin, Package, Utensils, Truck, Car, ShoppingBag, Bike } from 'lucide-react'
import { AddressAutocomplete } from '@/components/address-autocomplete'

// Canadian postal code utilities
function formatCanadianPostalCode(input: string): string {
  // Remove all non-alphanumeric characters
  const cleaned = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  
  // Apply H1A 1A1 format
  if (cleaned.length <= 3) {
    return cleaned
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
  }
  
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`
}

function isValidCanadianPostalCode(postalCode: string): boolean {
  // Canadian postal code regex: Letter-Number-Letter Number-Letter-Number
  const canadianPostalRegex = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/
  return canadianPostalRegex.test(postalCode)
}

type OrderType = 'dine_in' | 'takeaway' | 'delivery'
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

interface CustomerInformationSectionProps {
  language?: string
  orderContext?: {
    source: 'qr' | 'web'
    branchId: string
    tableNumber?: number
    zone?: string
    isQROrder: boolean
    selectedOrderType?: 'dine_in' | 'takeaway' | 'delivery' | null
  }
  onValidationChange?: (isValid: boolean, formData: any) => void
}

export const CustomerInformationSection = forwardRef<any, CustomerInformationSectionProps>(({ language = 'en', orderContext, onValidationChange }, ref) => {
  // Get translations based on language
  const getOrderTypeText = (type: string) => {
    if (language === 'fr') {
      switch (type) {
        case 'dineIn': return 'Sur place'
        case 'takeaway': return 'À emporter'
        case 'delivery': return 'Livraison'
        default: return type
      }
    } else {
      switch (type) {
        case 'dineIn': return 'Dine In'
        case 'takeaway': return 'Takeaway'
        case 'delivery': return 'Delivery'
        default: return type
      }
    }
  }
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    orderType: orderContext?.selectedOrderType || (orderContext?.isQROrder ? 'dine_in' : 'takeaway')
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

  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({})
  
  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  // Simple validation - always pass
  const validateForm = () => {
    // Always return valid
    const formData = {
      customerInfo,
      address,
      orderType: customerInfo.orderType
    }
    onValidationChange?.(true, formData)
    
    return { isValid: true, errors: {} }
  }
  
  // Public method to trigger validation from parent (always returns true)
  const triggerValidation = () => {
    validateForm()
    return true
  }

  const addressTypes = [
    { value: 'home', label: 'Home/House', icon: Home },
    { value: 'apartment', label: 'Apartment/Condo', icon: Building },
    { value: 'office', label: 'Office/Commercial', icon: Building2 },
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
    
    // Always trigger validation to update form state
    setTimeout(() => validateForm(), 0)
  }
  
  const handleInputFocus = (fieldName: string) => {
    // Clear red border when user focuses on input
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: false }))
    }
  }


  // Initial validation on mount and when dependencies change
  React.useEffect(() => {
    validateForm()
  }, [customerInfo, address, orderContext?.isQROrder, language])
  
  // Expose triggerValidation method to parent
  useImperativeHandle(ref, () => ({
    triggerValidation
  }), [triggerValidation])

  // Additional effect to catch autofill changes
  React.useEffect(() => {
    const handleAutofill = () => {
      setTimeout(() => validateForm(), 100)
    }

    // Listen for various autofill events
    const nameInput = document.getElementById('customer-name')
    const phoneInput = document.getElementById('customer-phone') 
    const emailInput = document.getElementById('customer-email')

    if (nameInput) {
      nameInput.addEventListener('input', handleAutofill)
      nameInput.addEventListener('change', handleAutofill)
    }
    if (phoneInput) {
      phoneInput.addEventListener('input', handleAutofill)
      phoneInput.addEventListener('change', handleAutofill)
    }
    if (emailInput) {
      emailInput.addEventListener('input', handleAutofill)
      emailInput.addEventListener('change', handleAutofill)
    }

    return () => {
      if (nameInput) {
        nameInput.removeEventListener('input', handleAutofill)
        nameInput.removeEventListener('change', handleAutofill)
      }
      if (phoneInput) {
        phoneInput.removeEventListener('input', handleAutofill)
        phoneInput.removeEventListener('change', handleAutofill)
      }
      if (emailInput) {
        emailInput.removeEventListener('input', handleAutofill)
        emailInput.removeEventListener('change', handleAutofill)
      }
    }
  }, [])

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }))
    // Trigger validation after state update
    setTimeout(() => validateForm(), 0)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">
        {language === 'fr' ? 'Informations du client' : 'Customer Information'}
      </h2>
      
      {/* Customer Details - Compact Layout */}
      <div className="space-y-4 mb-6">
        {/* Name & Phone - Side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name" className="text-sm font-medium text-gray-700">
              {language === 'fr' ? 'Nom complet *' : 'Full Name *'}
            </Label>
            <Input
              id="customer-name"
              type="text"
              placeholder="John Doe"
              value={customerInfo.name}
              onChange={(e) => handleCustomerChange('name', e.target.value)}
              onBlur={(e) => handleCustomerChange('name', e.target.value)}
              onInput={(e) => handleCustomerChange('name', e.target.value)}
              className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${validationErrors.name ? 'border-red-500' : ''}`}
              onFocus={() => handleInputFocus('name')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone" className="text-sm font-medium text-gray-700">
              {language === 'fr' ? 'Numéro de téléphone *' : 'Phone Number *'}
            </Label>
            <Input
              id="customer-phone"
              type="tel"
              placeholder="(416) 123-4567"
              value={customerInfo.phone}
              onChange={(e) => handleCustomerChange('phone', e.target.value)}
              className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${validationErrors.phone ? 'border-red-500' : ''}`}
              onFocus={() => handleInputFocus('phone')}
            />
          </div>
        </div>

        {/* Email - Full width */}
        <div className="space-y-2">
          <Label htmlFor="customer-email" className="text-sm font-medium text-gray-700">
            {language === 'fr' ? 'Adresse courriel (Optionnel)' : 'Email Address (Optional)'}
          </Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="john@example.com"
            value={customerInfo.email}
            onChange={(e) => handleCustomerChange('email', e.target.value)}
            onBlur={(e) => handleCustomerChange('email', e.target.value)}
            onInput={(e) => handleCustomerChange('email', e.target.value)}
            className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${validationErrors.email ? 'border-red-500' : ''}`}
            onFocus={() => handleInputFocus('email')}
          />
          <p className="text-xs text-gray-500">
            {language === 'fr' ? 'Nous l\'utiliserons pour vous envoyer des mises à jour de commande' : 'We\'ll use this to send you order updates'}
          </p>
        </div>
      </div>

      {/* Order Type Selection - Dynamic based on source */}
      <div className="mb-6">
        {(orderContext?.isQROrder && orderContext?.source === 'qr') ? (
          // QR Users: Show table info + Dine In/Takeaway choice
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-blue-900">
                      {language === 'fr' ? 'Commande code QR' : 'QR Code Order'} (
                      {orderContext.zone === 'Screen' 
                        ? 'Screen'
                        : `${language === 'fr' ? 'Table' : 'Table'} ${orderContext.tableNumber}`
                      })
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                {language === 'fr' ? 'Type de commande' : 'Order Type'}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={customerInfo.orderType === 'dine_in' ? 'default' : 'outline'}
                  onClick={() => handleCustomerChange('orderType', 'dine_in')}
                  className={`flex items-center justify-center gap-2 h-11 rounded-lg transition-all ${
                    customerInfo.orderType === 'dine_in' 
                      ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Utensils className="h-4 w-4" />
                  <span className="font-medium">{getOrderTypeText('dineIn')}</span>
                </Button>
                
                <Button
                  variant={customerInfo.orderType === 'takeaway' ? 'default' : 'outline'}
                  onClick={() => handleCustomerChange('orderType', 'takeaway')}
                  className={`flex items-center justify-center gap-2 h-11 rounded-lg transition-all ${
                    customerInfo.orderType === 'takeaway' 
                      ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span className="font-medium">{getOrderTypeText('takeaway')}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Web Users: Takeaway + Delivery choice
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              {language === 'fr' ? 'Type de commande' : 'Order Type'}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={customerInfo.orderType === 'takeaway' ? 'default' : 'outline'}
                onClick={() => handleCustomerChange('orderType', 'takeaway')}
                className={`flex items-center justify-center gap-2 h-11 rounded-lg transition-all ${
                  customerInfo.orderType === 'takeaway' 
                    ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="font-medium">{getOrderTypeText('takeaway')}</span>
              </Button>
              
              <Button
                variant={customerInfo.orderType === 'delivery' ? 'default' : 'outline'}
                onClick={() => handleCustomerChange('orderType', 'delivery')}
                className={`flex items-center justify-center gap-2 h-11 rounded-lg transition-all ${
                  customerInfo.orderType === 'delivery' 
                    ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Bike className="h-4 w-4" />
                <span className="font-medium">{getOrderTypeText('delivery')}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Address (only for web delivery users) */}
      {!orderContext?.isQROrder && customerInfo.orderType === 'delivery' && (
        <>
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              {language === 'fr' ? 'Adresse de livraison' : 'Delivery Address'}
            </h3>
            
            {/* Address Type Selection - Smaller buttons */}
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {language === 'fr' ? 'Type d\'adresse' : 'Address Type'}
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {addressTypes.map((type) => {
                  const IconComponent = type.icon
                  return (
                    <Button
                      key={type.value}
                      variant={address.type === type.value ? 'default' : 'outline'}
                      onClick={() => handleAddressChange('type', type.value)}
                      className={`flex flex-col items-center gap-1 h-14 p-2 text-xs rounded-lg transition-all ${
                        address.type === type.value
                          ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922]' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="h-3 w-3" />
                      <span className="leading-tight">{type.label.split('/')[0]}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Address Fields - Compact grid */}
            <div className="space-y-3">
              {/* For Office: Number + Suite in first row, Street Name in second row */}
              {address.type === 'office' ? (
                <>
                  {/* Number + Suite Number */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="street-number" className="text-sm font-medium text-gray-700">
                        Number *
                      </Label>
                      <Input
                        id="street-number"
                        placeholder="123"
                        value={address.streetNumber}
                        onChange={(e) => handleAddressChange('streetNumber', e.target.value)}
                        className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="unit-number" className="text-sm font-medium text-gray-700">
                        Suite Number (Optional)
                      </Label>
                      <Input
                        id="unit-number"
                        placeholder="201"
                        value={address.unitNumber}
                        onChange={(e) => handleAddressChange('unitNumber', e.target.value)}
                        className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                      />
                    </div>
                  </div>
                  
                  {/* Street Name - Full width */}
                  <div className="space-y-1">
                    <Label htmlFor="street-name" className="text-sm font-medium text-gray-700">
                      Street Name *
                    </Label>
                    <AddressAutocomplete
                      value={address.streetName}
                      onChange={(value) => handleAddressChange('streetName', value)}
                      placeholder="Main Street"
                      className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                      language={language}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Default: Number + Street Name */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="street-number" className="text-sm font-medium text-gray-700">
                        Number *
                      </Label>
                      <Input
                        id="street-number"
                        placeholder="123"
                        value={address.streetNumber}
                        onChange={(e) => handleAddressChange('streetNumber', e.target.value)}
                        className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label htmlFor="street-name" className="text-sm font-medium text-gray-700">
                        Street Name *
                      </Label>
                      <AddressAutocomplete
                        value={address.streetName}
                        onChange={(value) => handleAddressChange('streetName', value)}
                        placeholder="Main Street"
                        className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                        language={language}
                      />
                    </div>
                  </div>

                  {/* Unit Number & Buzzer Code (for apartments only) */}
                  {address.type === 'apartment' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="unit-number" className="text-sm font-medium text-gray-700">
                          Unit Number *
                        </Label>
                        <Input
                          id="unit-number"
                          placeholder="4B"
                          value={address.unitNumber}
                          onChange={(e) => handleAddressChange('unitNumber', e.target.value)}
                          className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="buzzer-code" className="text-sm font-medium text-gray-700">
                          Buzzer Code (Optional)
                        </Label>
                        <Input
                          id="buzzer-code"
                          placeholder="1234 or #4B"
                          value={address.buzzerCode}
                          onChange={(e) => handleAddressChange('buzzerCode', e.target.value)}
                          className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* City, Province, Postal Code */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                    City *
                  </Label>
                  <AddressAutocomplete
                    value={address.city}
                    onChange={(value) => handleAddressChange('city', value)}
                    onAddressSelect={(addressData) => {
                      // Auto-fill province when city is selected
                      if (addressData.mappedProvinceCode) {
                        handleAddressChange('province', addressData.mappedProvinceCode)
                      }
                    }}
                    placeholder="Montreal"
                    className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                    language={language}
                    searchType="city"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="province" className="text-sm font-medium text-gray-700">
                    Province *
                  </Label>
                  <Select value={address.province} onValueChange={(value) => handleAddressChange('province', value)}>
                    <SelectTrigger className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg">
                      <SelectValue placeholder="QC" />
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
                <div className="space-y-1">
                  <Label htmlFor="postal-code" className="text-sm font-medium text-gray-700">
                    Postal Code *
                  </Label>
                  <Input
                    id="postal-code"
                    placeholder="H1A 1A1"
                    value={address.postalCode}
                    onChange={(e) => {
                      const formatted = formatCanadianPostalCode(e.target.value)
                      handleAddressChange('postalCode', formatted)
                    }}
                    maxLength={7}
                    className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${
                      address.postalCode && !isValidCanadianPostalCode(address.postalCode) 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500' 
                        : ''
                    }`}
                  />
                </div>
              </div>

              {/* Delivery Instructions */}
              <div className="space-y-1">
                <Label htmlFor="delivery-instructions" className="text-sm font-medium text-gray-700">
                  Delivery Instructions (Optional)
                </Label>
                <Input
                  id="delivery-instructions"
                  placeholder="Ring doorbell, leave at door, etc."
                  value={address.deliveryInstructions}
                  onChange={(e) => handleAddressChange('deliveryInstructions', e.target.value)}
                  className="h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
})