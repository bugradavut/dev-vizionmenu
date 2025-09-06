"use client"

import React, { useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Home, Building, Building2, MapPin, Utensils, ShoppingBag, Bike } from 'lucide-react'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

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

// Email validation utility
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Canadian phone number utilities
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '') // Remove all non-digits
}

function isValidCanadianPhone(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone)
  
  // 10 digits (example: 4165551234)
  if (cleaned.length === 10) return true
  
  // 11 digits starting with 1 (example: 14165551234)
  if (cleaned.length === 11 && cleaned.startsWith('1')) return true
  
  return false
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

interface ValidationData {
  customerInfo: CustomerInfo;
  address: DeliveryAddress;
  orderType: OrderType;
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
  onValidationChange?: (isValid: boolean, formData: ValidationData) => void
  onOrderTypeChange?: (orderType: 'takeaway' | 'delivery' | null) => void
}

const CustomerInformationSectionComponent = forwardRef<{ triggerValidation: () => boolean }, CustomerInformationSectionProps>(({ language = 'en', orderContext, onValidationChange, onOrderTypeChange }, ref) => {
  const { language: contextLanguage } = useLanguage()
  const t = translations[contextLanguage] || translations.en
  const currentLanguage = language || contextLanguage
  const { toast } = useToast()

  // Get translations based on language
  const getOrderTypeText = (type: string) => {
    if (currentLanguage === 'fr') {
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
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  
  // Address type specific required fields
  const getRequiredAddressFields = (addressType: AddressType): (keyof DeliveryAddress)[] => {
    const baseRequired: (keyof DeliveryAddress)[] = ['streetNumber', 'streetName', 'city', 'province', 'postalCode']
    
    switch (addressType) {
      case 'apartment':
        return [...baseRequired, 'unitNumber'] // Unit Number required for apartments
      case 'office':
        return baseRequired // Suite Number is optional for office
      case 'home':
      case 'other':
      default:
        return baseRequired
    }
  }

  // Required field validation 
  const validateForm = (showErrors: boolean = false) => {
    const errors: {[key: string]: boolean} = {}
    
    // Check required customer info fields: name, phone, email
    if (!customerInfo.name.trim()) {
      errors.name = true
    }
    if (!customerInfo.phone.trim()) {
      errors.phone = true
    } else if (!isValidCanadianPhone(customerInfo.phone)) {
      errors.phone_format = true
    }
    if (!customerInfo.email.trim()) {
      errors.email = true
    } else if (!isValidEmail(customerInfo.email)) {
      errors.email_format = true
    }
    
    // Check delivery address fields if order type is delivery
    if (customerInfo.orderType === 'delivery' && !orderContext?.isQROrder) {
      const requiredAddressFields = getRequiredAddressFields(address.type)
      
      requiredAddressFields.forEach(field => {
        const value = address[field]
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors[`address_${field}`] = true
        }
      })
      
      // Special validation for postal code format
      if (address.postalCode.trim() && !isValidCanadianPostalCode(address.postalCode)) {
        errors.address_postalCode = true
      }
    }
    
    const isValid = Object.keys(errors).length === 0
    
    if (showErrors) {
      setValidationErrors(errors)
      setShowValidationErrors(true)
    }
    
    const formData = {
      customerInfo,
      address,
      orderType: customerInfo.orderType
    }
    
    onValidationChange?.(isValid, formData)
    return { isValid, errors }
  }
  
  // Public method to trigger validation from parent
  const triggerValidation = useCallback(() => {
    const validation = validateForm(true) // Show errors when called from confirm button
    
    if (!validation.isValid) {
      // Determine the most appropriate error message
      let toastMessage: string = t.orderPage.review.validationError // Default message
      
      // Check for specific format errors first
      if (validation.errors.email_format) {
        toastMessage = currentLanguage === 'fr' 
          ? 'Veuillez entrer une adresse courriel valide'
          : 'Please enter a valid email address'
      } else if (validation.errors.phone_format) {
        toastMessage = currentLanguage === 'fr' 
          ? 'Veuillez entrer un numéro de téléphone canadien valide'
          : 'Please enter a valid Canadian phone number'
      } else if (Object.keys(validation.errors).some(key => key.includes('address_'))) {
        // Address-related errors
        toastMessage = currentLanguage === 'fr' 
          ? 'Veuillez remplir tous les champs d\'adresse requis'
          : 'Please fill in all required address fields'
      }
      
      // Show toast notification
      toast({
        variant: "destructive",
        description: toastMessage,
      })
      
      // Scroll to first empty field
      const firstEmptyField = Object.keys(validation.errors)[0]
      if (firstEmptyField) {
        let element = null
        
        if (firstEmptyField.startsWith('address_')) {
          // Handle address field errors
          const fieldName = firstEmptyField.replace('address_', '')
          
          // Special handling for different field IDs
          switch (fieldName) {
            case 'streetNumber':
              element = document.getElementById('street-number')
              break
            case 'streetName':
              element = document.getElementById('street-name')
              break
            case 'unitNumber':
              element = document.getElementById('unit-number')
              break
            case 'postalCode':
              element = document.getElementById('postal-code')
              break
            default:
              element = document.getElementById(fieldName)
          }
        } else {
          // Handle customer info field errors (including format errors)
          const fieldName = firstEmptyField.replace('_format', '') // Remove format suffix if exists
          element = document.getElementById(`customer-${fieldName}`)
        }
        
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          element.focus()
        }
      }
      
      return false
    }
    
    return true
  }, [validateForm, currentLanguage, toast, t.orderPage.review.validationError])

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
    const newCustomerInfo = { ...customerInfo, [field]: value }
    setCustomerInfo(newCustomerInfo)
    
    // If orderType changed, notify parent (for minimum order logic)
    if (field === 'orderType' && onOrderTypeChange) {
      // Convert OrderType to the expected format for minimum order logic
      if (value === 'takeaway' || value === 'delivery') {
        onOrderTypeChange(value)
      } else {
        onOrderTypeChange(null) // dine_in doesn't need minimum order validation
      }
    }
    
    // Clear validation error for this field when user types (only if errors are being shown)
    if (showValidationErrors && (validationErrors[field] || validationErrors[`${field}_format`])) {
      setValidationErrors(prev => ({ 
        ...prev, 
        [field]: false,
        [`${field}_format`]: false
      }))
    }
    
    // Always update parent with current form data
    const formData = {
      customerInfo: newCustomerInfo,
      address,
      orderType: newCustomerInfo.orderType
    }
    
    // Check if form is valid (but don't show errors yet)
    const errors: {[key: string]: boolean} = {}
    if (!newCustomerInfo.name.trim()) errors.name = true
    if (!newCustomerInfo.phone.trim()) {
      errors.phone = true
    } else if (!isValidCanadianPhone(newCustomerInfo.phone)) {
      errors.phone_format = true
    }
    if (!newCustomerInfo.email.trim()) {
      errors.email = true
    } else if (!isValidEmail(newCustomerInfo.email)) {
      errors.email_format = true
    }
    const isValid = Object.keys(errors).length === 0
    
    onValidationChange?.(isValid, formData)
  }
  
  const handleInputFocus = (fieldName: string) => {
    // Clear red border when user focuses on input (only if errors are being shown)
    if (showValidationErrors && (validationErrors[fieldName] || validationErrors[`${fieldName}_format`])) {
      setValidationErrors(prev => ({ 
        ...prev, 
        [fieldName]: false,
        [`${fieldName}_format`]: false
      }))
    }
  }


  // Initial validation on mount and when dependencies change (but don't show errors)
  React.useEffect(() => {
    validateForm(false) // Don't show errors on initial load
  }, [customerInfo, address, orderContext?.isQROrder, currentLanguage])
  
  // Expose triggerValidation method to parent
  useImperativeHandle(ref, () => ({
    triggerValidation
  }), [triggerValidation])

  // Additional effect to catch autofill changes
  React.useEffect(() => {
    const handleAutofill = () => {
      setTimeout(() => validateForm(false), 100) // Don't show errors for autofill
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
    
    // Clear validation error for this field when user types (only if errors are being shown)
    const errorKey = `address_${field}`
    if (showValidationErrors && validationErrors[errorKey]) {
      setValidationErrors(prev => ({ ...prev, [errorKey]: false }))
    }
    
    // Trigger validation after state update (but don't show errors)
    setTimeout(() => validateForm(false), 0)
  }

  const handleAddressInputFocus = (fieldName: string) => {
    // Clear red border when user focuses on address input (only if errors are being shown)
    const errorKey = `address_${fieldName}`
    if (showValidationErrors && validationErrors[errorKey]) {
      setValidationErrors(prev => ({ ...prev, [errorKey]: false }))
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">
        {currentLanguage === 'fr' ? 'Informations du client' : 'Customer Information'}
      </h2>
      
      {/* Customer Details - Compact Layout */}
      <div className="space-y-4 mb-6">
        {/* Name & Phone - Side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name" className="text-sm font-medium text-gray-700">
              {currentLanguage === 'fr' ? 'Nom complet *' : 'Full Name *'}
            </Label>
            <Input
              id="customer-name"
              type="text"
              placeholder="John Doe"
              value={customerInfo.name}
              onChange={(e) => handleCustomerChange('name', (e.target as HTMLInputElement).value)}
              onBlur={(e) => handleCustomerChange('name', (e.target as HTMLInputElement).value)}
              onInput={(e) => handleCustomerChange('name', (e.target as HTMLInputElement).value)}
              className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.name ? 'border-red-500 border-2' : ''}`}
              onFocus={() => handleInputFocus('name')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone" className="text-sm font-medium text-gray-700">
              {currentLanguage === 'fr' ? 'Numéro de téléphone *' : 'Phone Number *'}
            </Label>
            <Input
              id="customer-phone"
              type="tel"
              placeholder="(416) 123-4567"
              value={customerInfo.phone}
              onChange={(e) => handleCustomerChange('phone', (e.target as HTMLInputElement).value)}
              onBlur={(e) => handleCustomerChange('phone', (e.target as HTMLInputElement).value)}
              onInput={(e) => handleCustomerChange('phone', (e.target as HTMLInputElement).value)}
              className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && (validationErrors.phone || validationErrors.phone_format) ? 'border-red-500 border-2' : ''}`}
              onFocus={() => handleInputFocus('phone')}
            />
          </div>
        </div>

        {/* Email - Full width */}
        <div className="space-y-2">
          <Label htmlFor="customer-email" className="text-sm font-medium text-gray-700">
            {currentLanguage === 'fr' ? 'Adresse courriel *' : 'Email Address *'}
          </Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="john@example.com"
            value={customerInfo.email}
            onChange={(e) => handleCustomerChange('email', (e.target as HTMLInputElement).value)}
            onBlur={(e) => handleCustomerChange('email', (e.target as HTMLInputElement).value)}
            onInput={(e) => handleCustomerChange('email', (e.target as HTMLInputElement).value)}
            className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && (validationErrors.email || validationErrors.email_format) ? 'border-red-500 border-2' : ''}`}
            onFocus={() => handleInputFocus('email')}
          />
          <p className="text-xs text-gray-500">
            {currentLanguage === 'fr' ? 'Nous l\'utiliserons pour vous envoyer des mises à jour de commande' : 'We\'ll use this to send you order updates'}
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
                      {currentLanguage === 'fr' ? 'Commande code QR' : 'QR Code Order'} (
                      {orderContext.zone === 'Screen' 
                        ? 'Screen'
                        : `${currentLanguage === 'fr' ? 'Table' : 'Table'} ${orderContext.tableNumber}`
                      })
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                {currentLanguage === 'fr' ? 'Type de commande' : 'Order Type'}
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
              {currentLanguage === 'fr' ? 'Adresse de livraison' : 'Delivery Address'}
            </h3>
            
            {/* Address Type Selection - Smaller buttons */}
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {currentLanguage === 'fr' ? 'Type d\'adresse' : 'Address Type'}
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
                        onFocus={() => handleAddressInputFocus('streetNumber')}
                        className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.address_streetNumber ? 'border-red-500 border-2' : ''}`}
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
                        onFocus={() => handleAddressInputFocus('unitNumber')}
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
                      className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.address_streetName ? 'border-red-500 border-2' : ''}`}
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
                        onFocus={() => handleAddressInputFocus('streetNumber')}
                        className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.address_streetNumber ? 'border-red-500 border-2' : ''}`}
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
                        className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.address_streetName ? 'border-red-500 border-2' : ''}`}
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
                          onFocus={() => handleAddressInputFocus('unitNumber')}
                          className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.address_unitNumber ? 'border-red-500 border-2' : ''}`}
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
                          onFocus={() => handleAddressInputFocus('buzzerCode')}
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
                    className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.address_city ? 'border-red-500 border-2' : ''}`}
                    language={language}
                    searchType="city"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="province" className="text-sm font-medium text-gray-700">
                    Province *
                  </Label>
                  <Select value={address.province} onValueChange={(value) => handleAddressChange('province', value)}>
                    <SelectTrigger 
                      className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${showValidationErrors && validationErrors.address_province ? 'border-red-500 border-2' : ''}`}
                      onFocus={() => handleAddressInputFocus('province')}
                    >
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
                    onFocus={() => handleAddressInputFocus('postalCode')}
                    className={`h-10 border-gray-300 focus:border-[#FF6922] focus:ring-[#FF6922] rounded-lg ${
                      (address.postalCode && !isValidCanadianPostalCode(address.postalCode)) || 
                      (showValidationErrors && validationErrors.address_postalCode)
                        ? 'border-red-500 border-2' 
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
                  onFocus={() => handleAddressInputFocus('deliveryInstructions')}
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

CustomerInformationSectionComponent.displayName = 'CustomerInformationSection'
export const CustomerInformationSection = CustomerInformationSectionComponent