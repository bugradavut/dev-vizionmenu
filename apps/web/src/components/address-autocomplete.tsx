"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useAddressSearch } from '@/hooks/useAddressSearch'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (addressData: {
    display_name: string
    place_id: string
    address: {
      house_number?: string
      road?: string
      city?: string
      town?: string
      village?: string
      state?: string
      postcode?: string
      country?: string
    }
    mappedProvinceCode?: string
  }) => void // Callback for full address data
  placeholder?: string
  className?: string
  language?: string
  searchType?: 'street' | 'city'
}

export function AddressAutocomplete({ 
  value, 
  onChange, 
  onAddressSelect,
  placeholder = "Enter street name",
  className = "",
  language = "en",
  searchType = "street"
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { suggestions, loading } = useAddressSearch(value, language, searchType)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsOpen(newValue.length >= 3)
  }

  const handleSuggestionClick = (suggestion: {
    display_name: string
    place_id: string
    address: {
      house_number?: string
      road?: string
      city?: string
      town?: string
      village?: string
      state?: string
      postcode?: string
      country?: string
    }
  }) => {
    let selectedValue = ''
    
    if (searchType === 'street') {
      selectedValue = suggestion.address?.road || suggestion.display_name
    } else if (searchType === 'city') {
      selectedValue = suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.display_name.split(',')[0]
    }
    
    onChange(selectedValue)
    setIsOpen(false)
    
    // Call the callback with full address data for auto-filling (including province mapping)
    if (onAddressSelect) {
      // Map province names to Canadian province codes
      const provinceMapping: { [key: string]: string } = {
        'alberta': 'AB',
        'british columbia': 'BC',
        'manitoba': 'MB',
        'new brunswick': 'NB',
        'newfoundland and labrador': 'NL',
        'nova scotia': 'NS',
        'ontario': 'ON',
        'prince edward island': 'PE',
        'quebec': 'QC',
        'saskatchewan': 'SK',
        'northwest territories': 'NT',
        'nunavut': 'NU',
        'yukon': 'YT'
      }
      
      const provinceName = suggestion.address?.state?.toLowerCase() || ''
      const provinceCode = provinceMapping[provinceName] || ''
      
      onAddressSelect({
        ...suggestion,
        mappedProvinceCode: provinceCode
      })
    }
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        onFocus={() => value.length >= 3 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)} // Delay to allow click
      />
      
      {isOpen && (suggestions.length > 0 || loading) && (
        <div className="absolute z-10 w-full min-w-[320px] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-gray-500">
              Searching...
            </div>
          )}
          
          {suggestions.map((suggestion) => {
            const primaryText = searchType === 'street' 
              ? (suggestion.address?.road || 'Unknown Street')
              : (suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || 'Unknown City')
            
            // Short secondary text - just city for streets, just province for cities
            const secondaryText = searchType === 'street'
              ? suggestion.address?.city || 'Unknown City'
              : suggestion.address?.state || 'Canada'
            
            return (
              <div
                key={suggestion.place_id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="text-sm font-medium text-gray-900">
                  {primaryText}
                </div>
                <div className="text-xs text-gray-500">
                  {secondaryText}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}