'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2 } from 'lucide-react'
import { useAddressSearch } from '@/hooks/useAddressSearch'
import { useLanguage } from '@/contexts/language-context'

interface AddressSearchInputProps {
  value: string
  onSelect: (address: string, coordinates?: {lat: number, lng: number}) => void
  placeholder?: string
  className?: string
}

export function AddressSearchInput({ 
  value, 
  onSelect, 
  placeholder,
  className 
}: AddressSearchInputProps) {
  const [query, setQuery] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const { language } = useLanguage()
  
  // Use the existing address search hook (street type for full addresses)
  const { suggestions, loading } = useAddressSearch(query, language, 'street')

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    setShowSuggestions(newQuery.length >= 3)
  }

  const handleSuggestionClick = (suggestion: { display_name: string; lat?: string; lon?: string }) => {
    const selectedAddress = suggestion.display_name
    setQuery(selectedAddress)
    setShowSuggestions(false)
    
    // Extract coordinates if available (from OpenStreetMap data)
    const coordinates = suggestion.lat && suggestion.lon ? {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    } : undefined
    
    onSelect(selectedAddress, coordinates)
  }

  const handleFocus = () => {
    if (query.length >= 3) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <Button
              key={`${suggestion.place_id}-${index}`}
              variant="ghost"
              className="w-full justify-start text-left h-auto p-3 hover:bg-accent"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-2 w-full">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">
                    {suggestion.address?.road && suggestion.address?.house_number 
                      ? `${suggestion.address.house_number} ${suggestion.address.road}`
                      : suggestion.display_name.split(',')[0]
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.display_name.split(',').slice(1).join(',').trim()}
                  </div>
                </div>
              </div>
            </Button>
          ))}
          
          {/* Info about the search */}
          <div className="px-3 py-2 text-xs text-muted-foreground border-t">
            {language === 'fr' 
              ? 'Recherche alimentée par OpenStreetMap'
              : 'Search powered by OpenStreetMap'
            }
          </div>
        </div>
      )}

      {showSuggestions && !loading && suggestions.length === 0 && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-md p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {language === 'fr' 
              ? 'Aucune adresse trouvée'
              : 'No addresses found'
            }
          </div>
        </div>
      )}
    </div>
  )
}