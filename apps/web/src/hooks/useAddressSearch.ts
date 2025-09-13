"use client"

import { useState, useEffect } from 'react'

interface AddressSuggestion {
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
}

// Popular Canadian cities for quick suggestions
const POPULAR_CANADIAN_CITIES = [
  { name: 'Montreal', province: 'QC', state: 'Quebec' },
  { name: 'Toronto', province: 'ON', state: 'Ontario' },
  { name: 'Vancouver', province: 'BC', state: 'British Columbia' },
  { name: 'Calgary', province: 'AB', state: 'Alberta' },
  { name: 'Edmonton', province: 'AB', state: 'Alberta' },
  { name: 'Ottawa', province: 'ON', state: 'Ontario' },
  { name: 'Winnipeg', province: 'MB', state: 'Manitoba' },
  { name: 'Quebec City', province: 'QC', state: 'Quebec' },
  { name: 'Hamilton', province: 'ON', state: 'Ontario' },
  { name: 'Kitchener', province: 'ON', state: 'Ontario' },
  { name: 'London', province: 'ON', state: 'Ontario' },
  { name: 'Victoria', province: 'BC', state: 'British Columbia' },
]

export function useAddressSearch(query: string, language: string = 'en', searchType: 'street' | 'city' = 'street') {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If query is too short, clear suggestions
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    const searchAddresses = async (mergeWithPopular = false, existingPopular: AddressSuggestion[] = []) => {
      setLoading(true)
      setError(null)
      
      try {
        let searchQuery = query
        
        if (searchType === 'street') {
          // For streets: add "street" if not present
          if (!query.toLowerCase().includes('street') && 
              !query.toLowerCase().includes('avenue') && 
              !query.toLowerCase().includes('road') && 
              !query.toLowerCase().includes('boulevard')) {
            searchQuery = `${query} street`
          }
        } else if (searchType === 'city') {
          // For cities: search as-is for better results
          searchQuery = `${query}, canada`
        }
        
        // Build URL with appropriate parameters for search type
        let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ca&accept-language=${language}&q=${encodeURIComponent(searchQuery)}`
        
        if (searchType === 'city') {
          // For city search: use featuretype=city to get only cities/towns
          apiUrl += '&featuretype=city&limit=8'
        } else {
          // For street search: keep existing behavior
          apiUrl += '&limit=5'
        }
        
        const response = await fetch(apiUrl)
        
        if (!response.ok) {
          throw new Error('Failed to fetch addresses')
        }
        
        const data = await response.json()
        
        // For city search: Filter and prioritize actual cities
        if (searchType === 'city') {
          const filteredCities = data.filter((item: AddressSuggestion) => {
            const cityName = item.address?.city || item.address?.town || item.address?.village
            const displayName = item.display_name?.toLowerCase() || ''
            
            // Only include results that are actual cities/towns
            return cityName && 
                   displayName.includes('canada') &&
                   // Exclude obvious non-cities
                   !displayName.includes('street') &&
                   !displayName.includes('avenue') &&
                   !displayName.includes('road') &&
                   !displayName.includes('building') &&
                   // More flexible: include if city name starts with or contains query
                   (cityName.toLowerCase().startsWith(query.toLowerCase()) ||
                    cityName.toLowerCase().includes(query.toLowerCase()))
          })
          
          // Sort by relevance: exact matches first, then partial matches
          filteredCities.sort((a: AddressSuggestion, b: AddressSuggestion) => {
            const aCity = (a.address?.city || a.address?.town || a.address?.village || '').toLowerCase()
            const bCity = (b.address?.city || b.address?.town || b.address?.village || '').toLowerCase()
            const queryLower = query.toLowerCase()
            
            // Exact matches first
            if (aCity === queryLower && bCity !== queryLower) return -1
            if (bCity === queryLower && aCity !== queryLower) return 1
            
            // Then starts with query
            if (aCity.startsWith(queryLower) && !bCity.startsWith(queryLower)) return -1
            if (bCity.startsWith(queryLower) && !aCity.startsWith(queryLower)) return 1
            
            return 0
          })
          
          // Remove duplicates based on city name (more effective than place_id for cities)
          const uniqueCities = filteredCities.filter((item: AddressSuggestion, index: number, arr: AddressSuggestion[]) => {
            const cityName = item.address?.city || item.address?.town || item.address?.village
            return arr.findIndex((t: AddressSuggestion) => {
              const tCityName = t.address?.city || t.address?.town || t.address?.village
              return tCityName?.toLowerCase() === cityName?.toLowerCase()
            }) === index
          })
          
          if (mergeWithPopular && existingPopular.length > 0) {
            // Merge popular cities with API results, avoid duplicates
            const combinedResults = [...existingPopular]
            
            uniqueCities.forEach((apiCity: AddressSuggestion) => {
              const cityName = apiCity.address?.city || apiCity.address?.town || apiCity.address?.village
              const isDuplicate = existingPopular.some((popular: AddressSuggestion) => 
                (popular.address?.city?.toLowerCase() === cityName?.toLowerCase())
              )
              
              if (!isDuplicate && combinedResults.length < 5) {
                combinedResults.push(apiCity)
              }
            })
            
            setSuggestions(combinedResults.slice(0, 5))
          } else {
            setSuggestions(uniqueCities.slice(0, 5))
          }
        } else {
          // For street search: Remove duplicates by display_name and road name
          const uniqueStreets = (data || []).filter((item: AddressSuggestion, index: number, arr: AddressSuggestion[]) => {
            // Check for duplicate display names or same road in same city
            return arr.findIndex(t => 
              t.display_name === item.display_name ||
              (t.address?.road === item.address?.road && 
               t.address?.city === item.address?.city)
            ) === index
          })
          setSuggestions(uniqueStreets.slice(0, 5))
        }
        
      } catch (err) {
        setError('Error searching addresses')
        setSuggestions([])
        console.error('Address search error:', err)
      } finally {
        setLoading(false)
      }
    }

    // For city search: Hybrid approach - popular cities + API
    if (searchType === 'city') {
      const matchingPopularCities = POPULAR_CANADIAN_CITIES.filter(city =>
        city.name.toLowerCase().includes(query.toLowerCase())
      )
      
      // Create popular suggestions
      const popularSuggestions: AddressSuggestion[] = matchingPopularCities.map(city => ({
        display_name: `${city.name}, ${city.state}, Canada`,
        place_id: `popular_${city.name.toLowerCase().replace(' ', '_')}`,
        address: {
          city: city.name,
          state: city.state,
        }
      }))
      
      // If we have popular matches and query is short, show them first
      if (popularSuggestions.length > 0 && query.length <= 5) {
        setSuggestions(popularSuggestions.slice(0, 3)) // Show top 3 popular
        
        // Also call API for additional results (async)
        setTimeout(() => {
          searchAddresses(true, popularSuggestions) // Pass popular suggestions to merge
        }, 100)
        return
      }
    }

    // Debounce: Wait 300ms before making API call
    const timeoutId = setTimeout(() => searchAddresses(), 300)
    
    return () => clearTimeout(timeoutId)
  }, [query, language, searchType])

  return {
    suggestions,
    loading,
    error
  }
}