/**
 * Geometry utility functions for location-based calculations
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate point
 * @param coord2 Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param point The point to check
 * @param polygon Array of polygon vertices [lat, lng]
 * @returns True if point is inside polygon
 */
export function isPointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false;

  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1]; // lng
    const yi = polygon[i][0]; // lat
    const xj = polygon[j][1]; // lng
    const yj = polygon[j][0]; // lat

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if coordinates are within any delivery zone
 * @param point Customer coordinates
 * @param deliveryZones Array of delivery zones with polygons
 * @returns True if point is in any active delivery zone
 */
export function isPointInDeliveryZones(
  point: Coordinates,
  deliveryZones: { enabled: boolean; zones: { polygon: [number, number][]; active: boolean }[] }
): boolean {
  if (!deliveryZones.enabled || !deliveryZones.zones.length) {
    return false;
  }

  return deliveryZones.zones.some(zone =>
    zone.active && isPointInPolygon(point, zone.polygon)
  );
}

/**
 * Format distance for display
 * @param distance Distance in kilometers
 * @param language Language for formatting
 * @returns Formatted distance string
 */
export function formatDistance(distance: number, language: 'en' | 'fr' = 'en'): string {
  if (distance < 1) {
    const meters = Math.round(distance * 1000);
    return language === 'fr' ? `${meters}m` : `${meters}m`;
  }
  return language === 'fr' ? `${distance}km` : `${distance}km`;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}