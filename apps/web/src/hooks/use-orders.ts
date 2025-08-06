"use client";

import { useState, useCallback, useEffect } from 'react';
import { ordersService, type Order, type OrderListParams, type OrderStatusUpdateRequest } from '@/services/orders.service';
import { ApiClientError } from '@/services/api-client';
// import { supabase } from '@/lib/supabase'; // TODO: Will be used for real-time updates"

interface UseOrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  realtimeConnected: boolean;
}

interface UseOrdersActions {
  fetchOrders: (params?: OrderListParams) => Promise<void>;
  updateOrderStatus: (orderId: string, statusData: OrderStatusUpdateRequest) => Promise<boolean>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

interface UseOrdersReturn extends UseOrdersState, UseOrdersActions {}

/**
 * Custom hook for order management with state management and API integration
 */
export function useOrders(initialParams?: OrderListParams): UseOrdersReturn {
  const [state, setState] = useState<UseOrdersState>({
    orders: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    limit: 20,
    realtimeConnected: false,
  });

  const [lastParams, setLastParams] = useState<OrderListParams | undefined>(initialParams);


  const fetchOrders = useCallback(async (params?: OrderListParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await ordersService.getOrders(params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData = ordersService.transformOrdersResponse(response as any);
      
      setState(prev => ({
        ...prev,
        orders: transformedData.orders,
        total: transformedData.total,
        page: transformedData.page,
        limit: transformedData.limit,
        loading: false,
      }));
      
      setLastParams(params);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      let errorMessage = 'Failed to load orders';
      
      if (error instanceof ApiClientError) {
        errorMessage = error.error.detail || error.error.title || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    orderId: string, 
    statusData: OrderStatusUpdateRequest
  ): Promise<boolean> => {
    try {
      const response = await ordersService.updateOrderStatus(orderId, statusData);
      
      if (response.data.success) {
        // Update the order in the current state
        setState(prev => ({
          ...prev,
          orders: prev.orders.map(order => 
            order.id === orderId 
              ? { ...order, status: statusData.status, updated_at: new Date().toISOString() }
              : order
          ),
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update order status:', error);
      
      let errorMessage = 'Failed to update order status';
      if (error instanceof ApiClientError) {
        errorMessage = error.error.detail || error.error.title || errorMessage;
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  const refetch = useCallback(async () => {
    if (lastParams !== undefined) {
      await fetchOrders(lastParams);
    }
  }, [fetchOrders, lastParams]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch on mount if initial params provided
  useEffect(() => {
    if (initialParams) {
      fetchOrders(initialParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - ignoring deps intentionally

  // Smart polling for live orders (Production-ready approach)
  useEffect(() => {
    // Set as "connected" for UI purposes
    setState(prev => ({ ...prev, realtimeConnected: true }));
    
    // Smart polling every 15 seconds for live orders
    const interval = setInterval(async () => {
      if (lastParams) {
        // Silent refetch (don't show loading)
        try {
          const response = await ordersService.getOrders(lastParams);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData = ordersService.transformOrdersResponse(response as any);
          
          setState(prev => ({
            ...prev,
            orders: transformedData.orders,
            total: transformedData.total,
            page: transformedData.page,
            limit: transformedData.limit,
          }));
        } catch (err) {
          // Silent refresh failed - no action needed
          console.debug('Silent refresh failed:', err);
        }
      }
    }, 15000); // 15 seconds - good balance for live orders

    return () => {
      clearInterval(interval);
    };
  }, [lastParams]); // Re-setup when params change

  return {
    ...state,
    fetchOrders,
    updateOrderStatus,
    refetch,
    clearError,
  };
}

// Hook for single order details
interface UseOrderDetailState {
  order: Order | null;
  loading: boolean;
  error: string | null;
}

interface UseOrderDetailActions {
  fetchOrder: (orderId: string) => Promise<void>;
  updateStatus: (statusData: OrderStatusUpdateRequest) => Promise<boolean>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

interface UseOrderDetailReturn extends UseOrderDetailState, UseOrderDetailActions {}

export function useOrderDetail(orderId?: string): UseOrderDetailReturn {
  const [state, setState] = useState<UseOrderDetailState>({
    order: null,
    loading: false,
    error: null,
  });

  const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(orderId);

  const fetchOrder = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Format order ID for API call
      const apiOrderId = id.includes('ORDER-') ? id : `ORDER-${id}`;
      
      // Real API call to get order details
      const response = await ordersService.getOrderById(apiOrderId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedOrder = ordersService.transformOrder(response.data as any);
      
      setState(prev => ({
        ...prev,
        order: transformedOrder,
        loading: false,
      }));
      
      setCurrentOrderId(id);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      let errorMessage = 'Failed to load order details';
      
      if (error instanceof ApiClientError) {
        errorMessage = error.error.detail || error.error.title || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const updateStatus = useCallback(async (statusData: OrderStatusUpdateRequest): Promise<boolean> => {
    if (!currentOrderId) return false;
    
    try {
      // Format order ID for API call
      const apiOrderId = currentOrderId.includes('ORDER-') 
        ? currentOrderId 
        : `ORDER-${currentOrderId}`;
      
      const response = await ordersService.updateOrderStatus(apiOrderId, statusData);
      
      if (response.data.success) {
        setState(prev => ({
          ...prev,
          order: prev.order ? {
            ...prev.order,
            status: statusData.status,
            updated_at: new Date().toISOString()
          } : null,
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update order status:', error);
      
      let errorMessage = 'Failed to update order status';
      if (error instanceof ApiClientError) {
        errorMessage = error.error.detail || error.error.title || errorMessage;
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [currentOrderId]);

  const refetch = useCallback(async () => {
    if (currentOrderId) {
      await fetchOrder(currentOrderId);
    }
  }, [fetchOrder, currentOrderId]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch on mount if orderId provided
  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - ignoring deps intentionally

  return {
    ...state,
    fetchOrder,
    updateStatus,
    refetch,
    clearError,
  };
}