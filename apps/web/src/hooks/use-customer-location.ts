/**
 * Customer location hook for geolocation and address handling
 */

import { useState, useCallback } from 'react';
import type { Coordinates } from '@/utils/geometry';

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface LocationState {
  coordinates: Coordinates | null;
  permission: LocationPermission;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseCustomerLocationReturn {
  location: LocationState;
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
  setManualLocation: (coordinates: Coordinates) => void;
}

export function useCustomerLocation(): UseCustomerLocationReturn {
  const [location, setLocation] = useState<LocationState>({
    coordinates: null,
    permission: 'prompt',
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const requestLocation = useCallback(async () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        permission: 'unsupported',
        error: 'Geolocation is not supported by this browser',
        loading: false,
      }));
      return;
    }

    setLocation(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      // Request current position with timeout
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds timeout
            maximumAge: 300000, // 5 minutes cache
          }
        );
      });

      const coordinates: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setLocation({
        coordinates,
        permission: 'granted',
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });

    } catch (error) {
      let errorMessage = 'Failed to get location';
      let permission: LocationPermission = 'denied';

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            permission = 'denied';
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            permission = 'denied';
            break;
          case GeolocationPositionError.TIMEOUT:
            errorMessage = 'Location request timed out';
            permission = 'prompt'; // Can try again
            break;
          default:
            errorMessage = 'Unknown location error';
            break;
        }
      }

      setLocation(prev => ({
        ...prev,
        permission,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation({
      coordinates: null,
      permission: 'prompt',
      loading: false,
      error: null,
      lastUpdated: null,
    });
  }, []);

  const setManualLocation = useCallback((coordinates: Coordinates) => {
    setLocation({
      coordinates,
      permission: 'granted',
      loading: false,
      error: null,
      lastUpdated: new Date(),
    });
  }, []);

  return {
    location,
    requestLocation,
    clearLocation,
    setManualLocation,
  };
}