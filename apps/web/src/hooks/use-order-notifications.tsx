/**
 * Order notification system hook
 * Detects new orders and triggers audio/visual notifications
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNotificationSound } from './use-notification-sound';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';
import toast from 'react-hot-toast';

export interface OrderNotificationOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  toastEnabled?: boolean;
  maxNotifications?: number;
  notificationTimeout?: number;
  soundUrl?: string;
}

export interface OrderNotificationReturn {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  isSoundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isToastEnabled: boolean;
  setToastEnabled: (enabled: boolean) => void;
  testNotification: () => Promise<void>;
}

/**
 * Hook for managing order notifications
 */
export const useOrderNotifications = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[],
  options: OrderNotificationOptions = {}
): OrderNotificationReturn => {
  const {
    enabled: initialEnabled = true,
    soundEnabled: initialSoundEnabled = true,
    toastEnabled: initialToastEnabled = true,
    maxNotifications = 5,
    notificationTimeout = 5000,
    soundUrl
  } = options;

  // Language context for translations
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  // Refs for state persistence
  const isEnabledRef = useRef(initialEnabled);
  const isSoundEnabledRef = useRef(initialSoundEnabled);
  const isToastEnabledRef = useRef(initialToastEnabled);

  // Track previous orders with timestamp-based detection
  const previousOrdersRef = useRef<Set<string>>(new Set());
  const notificationCountRef = useRef(0);
  const lastNotificationTimeRef = useRef(0);
  const sessionStartTimeRef = useRef(Date.now());
  const initializedRef = useRef(false); // marks completion of the first poll (prevents missing first real order)

  // Audio notification hook
  const { playSound, testSound } = useNotificationSound({
    soundUrl,
    enabled: isSoundEnabledRef.current,
    volume: 0.8,
    fallbackToBeep: false  // Use actual sound file from settings
  });

  // Format order message with bold formatting (removed - will use JSX instead)
  // const formatOrderMessage = useCallback((orderNumber: string, customerName: string, total: string) => {
  //   return t.orderNotifications.orderMessage
  //     .replace('{orderNumber}', orderNumber)
  //     .replace('{customerName}', customerName)
  //     .replace('{total}', total);
  // }, [t]);

  // Show modern minimal toast notification for new order with animations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const showOrderToast = useCallback((order: any) => {
    const orderNumber = order.orderNumber || order.id;
    const customerName = order.customer?.name || order.customer_name || 'Customer';
    const total = order.pricing?.total?.toFixed(2) || order.total || '0.00';
    
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
  }, [t, language]);

  // Process new orders and trigger notifications
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processNewOrders = useCallback(async (currentOrders: any[]) => {
    // Mark first invocation so sessionStartTimeRef works as intended
    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    if (!isEnabledRef.current || !currentOrders) {
      return;
    }

    // Create set of current order IDs
    const currentOrderIds = new Set(currentOrders.map(order => order.id));

    // Do not early-return here: rely on time-based filter so that
    // only orders created after sessionStart are notified.

    // Find new orders with intelligent timestamp checking
    const newOrders = currentOrders.filter(order => {
      const orderCreatedAt = new Date(order.created_at || order.createdAt).getTime();
      const isAfterSessionStart = orderCreatedAt >= (sessionStartTimeRef.current - 2000); // 2s tolerance
      const isNewOrder = !previousOrdersRef.current.has(order.id);
      const isLiveOrder = order.status === 'preparing' || order.status === 'scheduled';

      // Notify only for orders created after page open and not seen before
      return isNewOrder && isAfterSessionStart && isLiveOrder;
    });

    // Update previous orders set
    previousOrdersRef.current = currentOrderIds;

    // Process new orders
    if (newOrders.length > 0) {
      const now = Date.now();
      const timeSinceLastNotification = now - lastNotificationTimeRef.current;
      
      // Prevent notification spam (min 2 seconds between notifications)
      if (timeSinceLastNotification < 2000) {
        return;
      }

      // Limit number of simultaneous notifications
      if (notificationCountRef.current >= maxNotifications) {
        return;
      }

      // Process notifications silently
      
      // Play sound notification
      if (isSoundEnabledRef.current) {
        try {
          await playSound();
        } catch {
          // Silent fail
        }
      }

      // Show toast notifications
      if (isToastEnabledRef.current) {
        newOrders.slice(0, 3).forEach((order, index) => {
          setTimeout(() => {
            showOrderToast(order);
            notificationCountRef.current++;
            
            // Decrease counter after toast duration
            setTimeout(() => {
              notificationCountRef.current = Math.max(0, notificationCountRef.current - 1);
            }, notificationTimeout);
          }, index * 500); // Stagger toasts by 500ms
        });
      }

      lastNotificationTimeRef.current = now;
    }
  }, [playSound, showOrderToast, maxNotifications, notificationTimeout]);

  // Watch for order changes
  useEffect(() => {
    processNewOrders(orders);
  }, [orders, processNewOrders]);

  // Initialize previous orders on first load with session tracking
  useEffect(() => {
    if (orders?.length > 0 && previousOrdersRef.current.size === 0) {
      // On first load, populate previous orders but don't trigger notifications
      previousOrdersRef.current = new Set(orders.map(order => order.id));
      sessionStartTimeRef.current = Date.now();
    }
  }, [orders]);

  // Test notification function
  const testNotification = useCallback(async (): Promise<void> => {
    
    // Test sound
    if (isSoundEnabledRef.current) {
      await testSound();
    }
    
    // Test toast
    if (isToastEnabledRef.current) {
      showOrderToast({
        id: 'test-order',
        orderNumber: '12345',
        customer_name: 'Test Customer',
        items: [{ name: 'Test Item' }],
        total: '25.99'
      });
    }
  }, [testSound, showOrderToast]);

  // Setter functions that update refs
  const setEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    isSoundEnabledRef.current = enabled;
  }, []);

  const setToastEnabled = useCallback((enabled: boolean) => {
    isToastEnabledRef.current = enabled;
  }, []);

  return {
    isEnabled: isEnabledRef.current,
    setEnabled,
    isSoundEnabled: isSoundEnabledRef.current,
    setSoundEnabled,
    isToastEnabled: isToastEnabledRef.current,
    setToastEnabled,
    testNotification
  };
};