"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOrderNotifications } from '@/hooks/use-order-notifications';
import { useCrossTabNotifications } from '@/hooks/use-cross-tab-notifications';
import { useWaiterCallNotifications } from '@/hooks/use-waiter-call-notifications';
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth';
import { ordersService } from '@/services/orders.service';
import { Toaster } from 'react-hot-toast';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';
import { getBranchSettings } from '@/services/branch-settings.service';
import { getSoundPath } from '@/lib/notification-sounds';
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
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);

  // Load branch notification settings
  const [notificationSettings, setNotificationSettings] = useState<{
    orderSound: string;
    waiterCallSound: string;
    soundEnabled: boolean;
  }>({
    orderSound: 'notification-bell.mp3',
    waiterCallSound: 'notification-bell.mp3',
    soundEnabled: true
  });

  // Load notification settings from branch settings
  useEffect(() => {
    if (!branchId) return;

    const loadNotificationSettings = async () => {
      try {
        const response = await getBranchSettings(branchId);
        if (response.settings.notificationSettings) {
          setNotificationSettings({
            orderSound: response.settings.notificationSettings.orderSound || 'notification-bell.mp3',
            waiterCallSound: response.settings.notificationSettings.waiterCallSound || 'notification-bell.mp3',
            soundEnabled: response.settings.notificationSettings.soundEnabled ?? true
          });
        }
      } catch (error) {
        console.debug('Could not load notification settings, using defaults:', error);
      }
    };

    loadNotificationSettings();
  }, [branchId]);


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
    soundUrl: getSoundPath(notificationSettings.orderSound),
    enabled: notificationSettings.soundEnabled,
    volume: 0.8,
    fallbackToBeep: false
  });

  // Format order message with bold formatting (removed - will use JSX instead)
  // const formatOrderMessage = React.useCallback((orderNumber: string, customerName: string, total: string) => {
  //   return t.orderNotifications.orderMessage
  //     .replace('{orderNumber}', orderNumber)
  //     .replace('{customerName}', customerName)
  //     .replace('{total}', total);
  // }, [t]);

  // Handle cross-tab notifications
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCrossTabNewOrder = React.useCallback(async (order: any) => {
    // Play sound
    try {
      await playSound();
    } catch {
      // Silent fail
    }
    
    // Show order notification toast with smooth animations
    const orderNumber = order.orderNumber || order.id;
    const customerName = order.customer?.name || 'Customer';
    const total = order.pricing?.total?.toFixed(2) || '0.00';
    
    // Custom dismiss function with exit animation
    const handleDismiss = (toastId: string) => {
      // First trigger exit animation
      const toastElement = document.querySelector(`[data-toast-id="${toastId}"]`);
      if (toastElement) {
        toastElement.classList.remove('toast-enter');
        toastElement.classList.add('toast-exit');
        
        // Wait for animation to complete, then dismiss
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 250); // Match CSS animation duration
      } else {
        // Fallback: immediate dismiss if element not found
        toast.dismiss(toastId);
      }
    };
    
    const toastId = toast.custom((toastProps) => (
      <div data-toast-id={toastProps.id}>
        <div className="bg-white dark:bg-gray-900 p-0 overflow-hidden toast-enter" 
             style={{
               width: '320px',
               maxWidth: '320px',
               minWidth: '320px',
               borderRadius: '20px',
               border: '1px solid rgba(0, 0, 0, 0.08)',
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.1)'
             }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.orderNotifications.newOrderReceived}
            </h3>
            <button
              onClick={() => handleDismiss(toastProps.id)}
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
              {language === 'fr' ? (
                <>
                  Une nouvelle commande <span className="font-bold">#{orderNumber}</span> a été placée par <span className="font-bold">{customerName}</span> pour un montant total de <span className="font-bold">{total} $</span>. Veuillez examiner et traiter la commande.
                </>
              ) : (
                <>
                  A new order <span className="font-bold">#{orderNumber}</span> has been placed by <span className="font-bold">{customerName}</span> with a total amount of <span className="font-bold">${total}</span>. Please review and process the order.
                </>
              )}
            </div>
            
            {/* Action Button */}
            <button
              onClick={() => {
                handleDismiss(toastProps.id);
                setTimeout(() => {
                  window.location.href = `/orders/${orderNumber}?context=live`;
                }, 250);
              }}
              className="w-full text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#e6440a'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary)'}
            >
              {t.orderNotifications.viewOrder}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity, // Disable auto-dismiss
      position: 'top-right',
    });
    
    // Manual dismiss after 10 seconds with animation
    setTimeout(() => {
      handleDismiss(toastId);
    }, 10000);
  }, [playSound, t, language, notificationSettings]);

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
          status: 'preparing,scheduled', // Include both preparing and scheduled orders
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
          const isAfterSessionStart = orderCreatedAt >= (notificationData.sessionStartTime - 2000); // 2s tolerance
          const isNewOrder = !notificationData.seenOrders.has(order.id);
          const isNotCompleted = !shouldCleanupOrder(order, notificationData.orderTimestamps);
          
          // Only notify for orders created after page open and not seen before
          return isNewOrder && isAfterSessionStart && isNotCompleted;
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
      
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
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
    soundEnabled: notificationSettings.soundEnabled,
    toastEnabled: true,
    soundUrl: getSoundPath(notificationSettings.orderSound)
  });

  // Initialize waiter call notifications
  useWaiterCallNotifications({
    enabled: true,
    soundEnabled: notificationSettings.soundEnabled,
    soundUrl: getSoundPath(notificationSettings.waiterCallSound)
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
    toast.success(t.orderNotifications.notificationHistoryCleared, { duration: 2000 });
  }, [t]);

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