/**
 * Geocoding service for address to coordinates conversion
 */

import type { Coordinates } from '@/utils/geometry';

export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

export class GeocodingError extends Error {
  code: 'INVALID_ADDRESS' | 'NETWORK_ERROR' | 'RATE_LIMIT' | 'API_ERROR';

  constructor(options: { code: 'INVALID_ADDRESS' | 'NETWORK_ERROR' | 'RATE_LIMIT' | 'API_ERROR'; message: string }) {
    super(options.message);
    this.name = 'GeocodingError';
    this.code = options.code;
  }
}

class GeocodingService {
  private readonly apiKey?: string;
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  constructor() {
    // Use OpenStreetMap Nominatim as free alternative to Google Maps
    // Can be switched to Google Maps API if needed in future
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  }

  /**
   * Convert address string to coordinates using OpenStreetMap Nominatim
   * @param address Address string to geocode
   * @param countryCode Optional country code to limit search (default: 'ca' for Canada)
   * @returns Promise resolving to geocoding result
   */
  async geocodeAddress(
    address: string,
    countryCode: string = 'ca'
  ): Promise<GeocodingResult> {
    if (!address.trim()) {
      throw new GeocodingError({
        code: 'INVALID_ADDRESS',
        message: 'Address cannot be empty',
      });
    }

    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        countrycodes: countryCode,
        addressdetails: '1',
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': 'VisionMenu/1.0', // Required by Nominatim
        },
      });

      if (!response.ok) {
        throw new GeocodingError({
          code: 'NETWORK_ERROR',
          message: `Network error: ${response.status}`,
        });
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new GeocodingError({
          code: 'INVALID_ADDRESS',
          message: 'Address not found',
        });
      }

      const result = data[0];
      const coordinates: Coordinates = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };

      // Validate coordinates
      if (isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
        throw new GeocodingError({
          code: 'API_ERROR',
          message: 'Invalid coordinates returned',
        });
      }

      return {
        coordinates,
        formattedAddress: result.display_name,
        city: result.address?.city || result.address?.town || result.address?.village,
        province: result.address?.state || result.address?.province,
        country: result.address?.country,
        postalCode: result.address?.postcode,
      };

    } catch (error) {
      if (error instanceof GeocodingError) {
        throw error;
      }

      // Handle network and other errors
      throw new GeocodingError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  /**
   * Validate if an address looks reasonable for geocoding
   * @param address Address string to validate
   * @returns True if address seems valid for geocoding
   */
  validateAddress(address: string): boolean {
    const trimmed = address.trim();

    // Basic validation rules
    if (trimmed.length < 5) return false;
    if (!/\d/.test(trimmed)) return false; // Should contain at least one number

    // Check for common address patterns
    const hasStreetIndicators = /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|way|lane|ln|pl|place|court|ct)\b/i.test(trimmed);
    const hasNumbers = /\d+/.test(trimmed);

    return hasStreetIndicators && hasNumbers;
  }

  /**
   * Format coordinates for display
   * @param coordinates Coordinates to format
   * @returns Formatted coordinates string
   */
  formatCoordinates(coordinates: Coordinates): string {
    return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();

// Export types for external use
export { GeocodingService };
export type { Coordinates };