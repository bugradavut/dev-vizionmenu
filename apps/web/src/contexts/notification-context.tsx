"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOrderNotifications } from '@/hooks/use-order-notifications';
import { useCrossTabNotifications } from '@/hooks/use-cross-tab-notifications';
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth';
import { ordersService } from '@/services/orders.service';
import { Toaster } from 'react-hot-toast';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import toast from 'react-hot-toast';

interface NotificationContextType {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  isSoundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isToastEnabled: boolean;
  setToastEnabled: (enabled: boolean) => void;
  testNotification: () => Promise<void>;
  clearSeenOrders: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { branchId, user } = useEnhancedAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  
  // Initialize notification tracking with status + timestamp hybrid system
  const [notificationData, setNotificationData] = useState<{
    seenOrders: Set<string>;
    orderTimestamps: Record<string, number>;
    lastNotificationTime: number;
    sessionStartTime: number;
  }>(() => {
    try {
      const stored = localStorage.getItem('vision-menu-notifications');
      const sessionStartTime = Date.now();
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const seenOrders = new Set<string>((parsed.seenOrders || []) as string[]);
        const lastNotificationTime: number = parsed.lastNotificationTime || sessionStartTime;
        
        // Clean up very old entries (older than 24 hours as last resort)
        const emergencyCleanupThreshold = Date.now() - (24 * 60 * 60 * 1000);
        if (lastNotificationTime < emergencyCleanupThreshold) {
          console.debug('🧹 Emergency cleanup - removing very old notification data');
          return {
            seenOrders: new Set(),
            orderTimestamps: {},
            lastNotificationTime: sessionStartTime,
            sessionStartTime
          };
        }
        
        return {
          seenOrders,
          orderTimestamps: parsed.orderTimestamps || {},
          lastNotificationTime,
          sessionStartTime
        };
      }
      
      return {
        seenOrders: new Set(),
        orderTimestamps: {},
        lastNotificationTime: sessionStartTime,
        sessionStartTime
      };
    } catch (error) {
      console.warn('⚠️ Failed to load notification data from localStorage:', error);
      const sessionStartTime = Date.now();
      return {
        seenOrders: new Set(),
        orderTimestamps: {},
        lastNotificationTime: sessionStartTime,
        sessionStartTime
      };
    }
  });

  // Audio notification hook for cross-tab notifications
  const { playSound } = useNotificationSound({
    enabled: true,
    volume: 0.8,
    fallbackToBeep: true
  });

  // Handle cross-tab notifications
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCrossTabNewOrder = React.useCallback(async (order: any) => {
    // Play sound
    try {
      await playSound();
    } catch {
      // Silent fail
    }
    
    // Show order notification toast
    const orderNumber = order.orderNumber || order.id;
    const customerName = order.customer?.name || 'Customer';
    const total = order.pricing?.total?.toFixed(2) || '0.00';
    
    toast.custom((t) => (
      <div className="bg-white dark:bg-gray-900 p-0 w-80 overflow-hidden" 
           style={{
             borderRadius: '20px',
             border: '1px solid rgba(0, 0, 0, 0.08)',
             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.1)'
           }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            New Order Received
          </h3>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6L18 18"/>
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="px-4 pb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            A new order <span className="font-bold">#{orderNumber}</span> has been placed by <span className="font-bold">{customerName}</span> with a total amount of <span className="font-bold">${total}</span>. Please review and process the order.
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => {
              toast.dismiss(t.id);
              window.location.href = `/orders/${orderNumber}?context=live`;
            }}
            className="w-full text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
            style={{ backgroundColor: 'var(--primary)' }}
            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#e6440a'}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary)'}
          >
            View Order
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7V17"/>
            </svg>
          </button>
        </div>
      </div>
    ), {
      duration: 10000, // 10 seconds
      position: 'top-right',
    });
  }, [playSound]);

  // Cross-tab notification hook
  const { broadcastNewOrder } = useCrossTabNotifications({
    enabled: true,
    onNewOrder: handleCrossTabNewOrder
  });

  // Smart cleanup function: Status-first, Time-fallback (outside useEffect)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shouldCleanupOrder = React.useCallback((order: any, timestamps: Record<string, number>) => {
    const orderId = order.id;
    const orderStatus = order.status;
    const lastSeenTime = timestamps[orderId];
    
    // 1. PRIMARY: Status-based cleanup (immediate)
    const completedStatuses = ['completed', 'cancelled', 'delivered', 'refunded'];
    if (completedStatuses.includes(orderStatus)) {
      console.debug('🗑️ Status-based cleanup:', orderId, 'status:', orderStatus);
      return true; // Hemen sil - bu siparişle işimiz bitti
    }
    
    // 2. FALLBACK: Short time-based cleanup (2 hours)
    if (lastSeenTime && (Date.now() - lastSeenTime) > (2 * 60 * 60 * 1000)) {
      console.debug('⏰ Time-based cleanup:', orderId, 'last seen:', new Date(lastSeenTime).toISOString());
      return true; // 2 saat sonra sil - stuck orders için
    }
    
    return false;
  }, []);

  // Background polling for new orders
  useEffect(() => {
    if (!branchId || !user) return;

    let intervalId: NodeJS.Timeout | undefined;

  const pollForNewOrders = async () => {
      try {
        // Only poll for pending orders to detect new ones
        const response = await ordersService.getOrders({
          status: 'pending',
          limit: 50
        });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedData = ordersService.transformOrdersResponse(response as any);
        const newOrders = transformedData.orders;
        
        // Apply smart cleanup: Remove completed/old orders before processing
        const currentTime = Date.now();
        const cleanedSeenOrders = new Set<string>();
        const cleanedTimestamps: Record<string, number> = {};
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newOrders.forEach((order: any) => {
          if (!shouldCleanupOrder(order, notificationData.orderTimestamps)) {
            // Keep this order in tracking
            cleanedSeenOrders.add(order.id);
            cleanedTimestamps[order.id] = notificationData.orderTimestamps[order.id] || currentTime;
          } else {
            // This order will be cleaned up (completed/cancelled/old)
            console.debug('🗑️ Cleaning up order:', order.id, 'status:', order.status);
          }
        });
        
        // Filter for truly new orders with intelligent detection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newOrderList = newOrders.filter((order: any) => {
          const orderCreatedAt = new Date(order.created_at || order.createdAt).getTime();
          const isRecentOrder = orderCreatedAt > (notificationData.sessionStartTime - (5 * 60 * 1000)); // 5 min buffer
          const isNewOrder = !notificationData.seenOrders.has(order.id);
          const hasSeenOrdersBefore = notificationData.seenOrders.size > 0;
          const isNotCompleted = !shouldCleanupOrder(order, notificationData.orderTimestamps);
          
          // Only notify for:
          // 1. Truly new orders (not seen before)
          // 2. Recent orders (created after session start - 5 min buffer)
          // 3. Not on initial page load (has seen orders before)
          // 4. Not completed/cancelled orders
          return isNewOrder && isRecentOrder && hasSeenOrdersBefore && isNotCompleted;
        });
        
        // Update state
        setOrders(newOrders);
        
        // Update notification tracking data with timestamps
        const updatedTimestamps = { ...cleanedTimestamps };
        
        // Add timestamps for new orders
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newOrders.forEach((order: any) => {
          if (!shouldCleanupOrder(order, notificationData.orderTimestamps)) {
            updatedTimestamps[order.id] = updatedTimestamps[order.id] || currentTime;
          }
        });
        
        const updatedNotificationData = {
          seenOrders: cleanedSeenOrders,
          orderTimestamps: updatedTimestamps,
          lastNotificationTime: newOrderList.length > 0 ? Date.now() : notificationData.lastNotificationTime,
          sessionStartTime: notificationData.sessionStartTime
        };
        
        setNotificationData(updatedNotificationData);
        
        // Persist to localStorage with timestamp
        try {
          localStorage.setItem('vision-menu-notifications', JSON.stringify({
            seenOrders: Array.from(cleanedSeenOrders),
            orderTimestamps: updatedTimestamps,
            lastNotificationTime: updatedNotificationData.lastNotificationTime,
            savedAt: Date.now()
          }));
        } catch (error) {
          console.warn('⚠️ Failed to save notification data to localStorage:', error);
        }
        
        // Broadcast new orders to other tabs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newOrderList.forEach((order: any) => {
          broadcastNewOrder(order);
        });
      } catch {
        // Silent fail - don't spam console
      }
    };

    // Initial poll
    pollForNewOrders();
    
    // Set up interval - poll every 15 seconds when tab is active
    const startPolling = () => {
      if (intervalId) return;
      
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          pollForNewOrders();
        }
      }, 15000);
      
      console.debug('🔄 Started background notification polling');
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
      console.debug('⏸️ Stopped background notification polling');
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.debug('👁️ Tab became visible - starting notification polling');
        startPolling();
        // Immediate poll when tab becomes visible
        pollForNewOrders();
      } else {
        console.debug('🙈 Tab became hidden - keeping minimal polling');
        // Don't stop completely, just reduce frequency
        if (intervalId) {
          clearInterval(intervalId);
          // Poll less frequently when hidden (every 60 seconds)
          intervalId = setInterval(pollForNewOrders, 60000);
        }
      }
    };

    // Start polling
    startPolling();
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [branchId, user, notificationData, broadcastNewOrder, shouldCleanupOrder]);

  // Initialize notification hooks
  const notificationHooks = useOrderNotifications(orders, {
    enabled: true,
    soundEnabled: true,
    toastEnabled: true
  });

  // Clear seen orders function (for debugging/admin use)
  const clearSeenOrders = React.useCallback(() => {
    localStorage.removeItem('vision-menu-notifications');
    const sessionStartTime = Date.now();
    setNotificationData({
      seenOrders: new Set(),
      orderTimestamps: {},
      lastNotificationTime: sessionStartTime,
      sessionStartTime
    });
    toast.success('Cleared notification history', { duration: 2000 });
  }, []);

  const contextValue: NotificationContextType = {
    isEnabled: notificationHooks.isEnabled,
    setEnabled: notificationHooks.setEnabled,
    isSoundEnabled: notificationHooks.isSoundEnabled,
    setSoundEnabled: notificationHooks.setSoundEnabled,
    isToastEnabled: notificationHooks.isToastEnabled,
    setToastEnabled: notificationHooks.setToastEnabled,
    testNotification: notificationHooks.testNotification,
    clearSeenOrders
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      <Toaster />
      {children}
    </NotificationContext.Provider>
  );
};