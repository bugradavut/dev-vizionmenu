/**
 * Cross-tab notification synchronization hook
 * Ensures notifications work across multiple browser tabs
 */

import { useEffect, useRef, useCallback } from 'react';

interface CrossTabMessage {
  type: 'NEW_ORDER_NOTIFICATION';
  payload: {
    orderId: string;
    orderNumber: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing: any;
    timestamp: number;
  };
}

interface UseCrossTabNotificationsOptions {
  enabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNewOrder?: (order: any) => void;
}

interface UseCrossTabNotificationsReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broadcastNewOrder: (order: any) => void;
  isSupported: boolean;
}

/**
 * Hook for cross-tab notification synchronization
 */
export const useCrossTabNotifications = (
  options: UseCrossTabNotificationsOptions = {}
): UseCrossTabNotificationsReturn => {
  const { enabled = true, onNewOrder } = options;
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSupported = typeof BroadcastChannel !== 'undefined';

  // Initialize broadcast channel
  useEffect(() => {
    if (!isSupported || !enabled) {
      return;
    }

    try {
      // Create broadcast channel for order notifications
      channelRef.current = new BroadcastChannel('vision-menu-notifications');

      // Handle messages from other tabs
      const handleMessage = (event: MessageEvent<CrossTabMessage>) => {
        if (event.data.type === 'NEW_ORDER_NOTIFICATION') {
          console.debug('🔄 Received cross-tab notification:', event.data.payload);
          
          // Call the callback if provided
          if (onNewOrder) {
            onNewOrder(event.data.payload);
          }
        }
      };

      channelRef.current.addEventListener('message', handleMessage);
      console.debug('📡 Cross-tab notifications initialized');

      // Cleanup function
      return () => {
        if (channelRef.current) {
          channelRef.current.removeEventListener('message', handleMessage);
          channelRef.current.close();
          channelRef.current = null;
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to initialize cross-tab notifications:', error);
    }
  }, [enabled, isSupported, onNewOrder]);

  // Broadcast new order to other tabs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcastNewOrder = useCallback((order: any) => {
    if (!channelRef.current || !enabled || !isSupported) {
      return;
    }

    try {
      const message: CrossTabMessage = {
        type: 'NEW_ORDER_NOTIFICATION',
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          pricing: order.pricing,
          timestamp: Date.now()
        }
      };

      channelRef.current.postMessage(message);
      console.debug('📤 Broadcasted new order to other tabs:', order.orderNumber);
    } catch (error) {
      console.warn('⚠️ Failed to broadcast new order:', error);
    }
  }, [enabled, isSupported]);

  return {
    broadcastNewOrder,
    isSupported
  };
};