/**
 * Custom hook for Uber Direct delivery quotes
 * Handles loading states and caching for delivery quotes
 */

import { useState, useCallback } from 'react';
import { uberDirectService, type UberDirectQuoteResponse, type UberDirectError } from '@/services/uber-direct.service';

interface UseUberDirectQuoteState {
  quote: UberDirectQuoteResponse | null;
  isLoading: boolean;
  error: UberDirectError | null;
  isQuoteExpired: boolean;
}

interface AddressInfo {
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
}

export function useUberDirectQuote() {
  const [state, setState] = useState<UseUberDirectQuoteState>({
    quote: null,
    isLoading: false,
    error: null,
    isQuoteExpired: false
  });

  /**
   * Check if quote is expired
   */
  const checkQuoteExpiry = useCallback((expiresAt: string): boolean => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    return now >= expiry;
  }, []);

  /**
   * Get delivery quote for address
   */
  const getQuote = useCallback(async (
    branchId: string,
    addressInfo: AddressInfo,
    authToken?: string
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const address = uberDirectService.formatAddressForQuote(addressInfo);
      const result = await uberDirectService.getDeliveryQuote(branchId, address, authToken);

      if (result.success) {
        const isExpired = checkQuoteExpiry(result.data.expires_at);
        setState({
          quote: result.data,
          isLoading: false,
          error: null,
          isQuoteExpired: isExpired
        });

        // Set up expiry timer
        if (!isExpired) {
          const expiryTime = new Date(result.data.expires_at).getTime() - Date.now();
          if (expiryTime > 0) {
            setTimeout(() => {
              setState(prev => ({ ...prev, isQuoteExpired: true }));
            }, expiryTime);
          }
        }
      } else {
        setState({
          quote: null,
          isLoading: false,
          error: result.error,
          isQuoteExpired: false
        });
      }
    } catch (error) {
      setState({
        quote: null,
        isLoading: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unexpected error occurred'
        },
        isQuoteExpired: false
      });
    }
  }, [checkQuoteExpiry]);

  /**
   * Clear current quote
   */
  const clearQuote = useCallback(() => {
    setState({
      quote: null,
      isLoading: false,
      error: null,
      isQuoteExpired: false
    });
  }, []);

  /**
   * Refresh expired quote
   */
  const refreshQuote = useCallback(async (
    branchId: string,
    addressInfo: AddressInfo,
    authToken?: string
  ) => {
    if (state.isQuoteExpired || !state.quote) {
      await getQuote(branchId, addressInfo, authToken);
    }
  }, [getQuote, state.isQuoteExpired, state.quote]);

  return {
    ...state,
    getQuote,
    clearQuote,
    refreshQuote,
    // Utility functions
    formatPrice: (cents: number) => `$${(cents / 100).toFixed(2)}`,
    formatETA: (minutes: number) => `${minutes} min`
  };
}