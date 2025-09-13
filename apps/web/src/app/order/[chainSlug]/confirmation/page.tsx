'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { orderService } from '@/services/order-service';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';
import { useCart } from '../../contexts/cart-context';
import { Check, Package, CheckCircle2, RefreshCw, TicketPercent } from 'lucide-react';

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedTime?: string;
  createdAt?: string;
  completedAt?: string;
  pricing?: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  items?: OrderItem[];
  branch?: {
    id: string;
    name: string;
    address: string;
  };
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  image_url?: string;
  description?: string;
}

interface DeliveryAddress {
  addressType: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  unitNumber?: string;
  buzzerCode?: string;
  deliveryInstructions?: string;
}

interface OrderSession {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  pricing: {
    itemsTotal?: number;
    subtotal: number;
    subtotalWithDelivery?: number;
    gst?: number;
    qst?: number;
    tipAmount?: number;
    total: number;
    // Legacy fields for backward compatibility
    subtotalAmount?: number;
    taxAmount: number;
    totalAmount?: number;
  };
  campaignDiscount?: {
    code: string;
    discountAmount: number;
    campaignType: 'percentage' | 'fixed_amount';
    campaignValue: number;
  } | null;
  deliveryFee?: number;
  deliveryInfo?: {
    appliedFee: number;
    baseFee: number;
    isFree: boolean;
    threshold: number;
    savings: number;
  } | null;
  tipDetails?: {
    amount: number;
    type: 'percentage' | 'fixed';
    value: number;
  } | null;
  orderType?: string;
  source?: string;
  branchId?: string; // Add branch ID for new order navigation
  tableNumber?: number;
  zone?: string;
  orderNotes?: string;
  deliveryAddress?: DeliveryAddress;
  timestamp?: number;
}

interface OrderConfirmationPageProps {
  params: Promise<{ chainSlug: string }>
}

// Helper function to format estimated time as completion time
const formatEstimatedCompletionTime = (estimatedTime: string, createdAt: string, language: string) => {
  try {
    // Extract minutes from estimated time string (e.g., "20 minutes" -> 20)
    const minutesMatch = estimatedTime.match(/(\d+)\s*minutes?/i);
    if (!minutesMatch) return estimatedTime; // Fallback to original format
    
    const minutes = parseInt(minutesMatch[1], 10);
    if (isNaN(minutes)) return estimatedTime;
    
    // Calculate completion time
    const orderTime = new Date(createdAt);
    const completionTime = new Date(orderTime.getTime() + minutes * 60 * 1000);
    
    // Format completion time
    const timeString = completionTime.toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Toronto'
    });
    
    return `${timeString} (${minutes} ${language === 'fr' ? 'minutes' : 'Minutes'})`;
  } catch (error) {
    console.warn('Error formatting estimated completion time:', error);
    return estimatedTime; // Fallback to original format
  }
};

// Simplified 3-step progress with correct timestamps
const getProgressSteps = (currentStatus: string, language: string, orderCreatedAt?: string) => {
  const isEnglish = language === 'en';
  
  // Format timestamp to Canada timezone
  const formatCanadaTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto'
    });
  };
  
  // Use order creation time as base time for timeline
  const baseTime = orderCreatedAt ? formatCanadaTime(orderCreatedAt) : null;
  
  const steps = [
    {
      key: 'received',
      label: isEnglish ? 'Order Received' : 'Commande reçue',
      icon: CheckCircle2,
      completed: true, // Always completed
      time: baseTime // Show actual order creation time
    },
    {
      key: 'preparing', 
      label: isEnglish ? 'Preparing' : 'Préparation',
      icon: Package,
      completed: ['confirmed', 'preparing', 'ready', 'completed'].includes(currentStatus),
      time: ['confirmed', 'preparing', 'ready', 'completed'].includes(currentStatus) ? baseTime : null
    },
    {
      key: 'completed',
      label: isEnglish ? 'Completed' : 'Terminé',
      icon: Check,
      completed: ['completed'].includes(currentStatus),
      time: currentStatus === 'completed' ? baseTime : null
    }
  ];
  
  return steps;
};

function OrderConfirmationContent({ chainSlug }: { chainSlug: string }) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [sessionData, setSessionData] = useState<OrderSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { items, clearCart, clearPreOrder } = useCart();
  const t = translations[language] || translations.en;
  
  const orderId = searchParams.get('orderId');

  // UPDATED: handleBackToMenu now uses chainSlug from props
  const handleBackToMenu = async () => {
    console.log('SessionData:', sessionData);
    console.log('BranchId from sessionData:', sessionData?.branchId);
    
    // Try to get branchId from sessionData first, then from URL params
    let branchId = sessionData?.branchId;
    if (!branchId) {
      // Try to get from URL search params (if user came from review page)
      branchId = new URLSearchParams(window.location.search).get('branch') || undefined;
      console.log('BranchId from URL:', branchId);
    }
    
    // NEW: Use chainSlug from URL parameter directly
    if (branchId && chainSlug) {
      const newUrl = `/order/${chainSlug}?branch=${branchId}`;
      console.log('Found chain from URL parameter, navigating to:', newUrl);
      window.open(newUrl, '_blank');
      return;
    } else if (chainSlug) {
      // Even without branchId, we can navigate to chain page
      const newUrl = `/order/${chainSlug}`;
      console.log('Using chainSlug from URL, navigating to:', newUrl);
      window.open(newUrl, '_blank');
      return;
    }
    
    // Fallback to general order page if we can't get specific chain/branch
    console.log('Using fallback: /order');
    window.open('/order', '_blank');
  };

  // Load data from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('vizion-order-confirmation');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          
          // Keep session data - expiration will be based on order completion status from API
          setSessionData(data);
          setOrderItems(data.items || []);
        } catch {
          // Silently fail and continue without session data
        }
      }
    }
  }, []);

  // Use sessionStorage data with API fallback
  // Get API pricing values (only use if they're greater than 0)
  const apiTax = (orderDetails?.pricing?.taxAmount && orderDetails.pricing.taxAmount > 0) ? orderDetails.pricing.taxAmount : 0
  const apiTotal = (orderDetails?.pricing?.total && orderDetails.pricing.total > 0) ? orderDetails.pricing.total : 0
  
  // Calculate pricing with comprehensive breakdown from sessionStorage
  const displayedItems = orderItems.length > 0 ? orderItems : items;
  
  // Use sessionStorage pricing if available, otherwise calculate
  const itemsTotal = sessionData?.pricing?.itemsTotal || displayedItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  const discountAmount = sessionData?.campaignDiscount?.discountAmount || 0
  const subtotalAfterDiscount = itemsTotal - discountAmount
  const deliveryFee = sessionData?.deliveryFee || 0
  const subtotalWithDelivery = subtotalAfterDiscount + deliveryFee
  
  // ✅ NEW CANADA TAX RULES: Tip amount added BEFORE taxes
  const tipAmount = sessionData?.tipDetails?.amount || 0
  const subtotalWithDeliveryAndTip = subtotalWithDelivery + tipAmount
  
  // Tax breakdown: Use sessionStorage GST/QST if available, otherwise calculate on subtotal + tip
  const gst = sessionData?.pricing?.gst || (apiTax > 0 ? apiTax * 0.333 : subtotalWithDeliveryAndTip * 0.05) // Estimate GST as 1/3 of total tax if from API
  const qst = sessionData?.pricing?.qst || (apiTax > 0 ? apiTax * 0.667 : subtotalWithDeliveryAndTip * 0.09975) // Estimate QST as 2/3 of total tax if from API
  const totalTax = gst + qst
  
  // Final calculations with fallbacks
  const total = apiTotal || sessionData?.pricing?.total || (subtotalWithDeliveryAndTip + totalTax)
  
  // Extract customer info from sessionStorage with fallbacks
  const customerName = sessionData?.customerName || 'Customer';
  const customerPhone = sessionData?.customerPhone || 'N/A';
  const customerEmail = sessionData?.customerEmail || '';
  const orderType = sessionData?.orderType || 'takeaway';
  const source = sessionData?.source as 'qr' | 'web' || 'web';
  const tableNumber = sessionData?.tableNumber;
  const zone = sessionData?.zone;
  const orderNumber = sessionData?.orderNumber;
  const orderNotes = sessionData?.orderNotes || '';
  const deliveryAddress = sessionData?.deliveryAddress;
  

  // Clear cart and pre-order when confirmation page loads (order is successful)
  useEffect(() => {
    clearCart();
    clearPreOrder();
  }, [clearCart, clearPreOrder]);

  // Cleanup sessionStorage based on order completion status
  useEffect(() => {
    if (orderDetails?.status === 'completed' && orderDetails?.completedAt) {
      // Check if order was completed more than 10 minutes ago
      const completionTime = new Date(orderDetails.completedAt).getTime();
      const tenMinutesLater = completionTime + (10 * 60 * 1000);
      const now = Date.now();
      
      if (now > tenMinutesLater) {
        // Order expired - cleanup immediately
        sessionStorage.removeItem('vizion-order-confirmation');
        setSessionData(null);
        // Redirect user as data is no longer valid
        console.log('Order confirmation has expired');
      } else {
        // Set timer for future cleanup
        const timeUntilCleanup = tenMinutesLater - now;
        const timeoutId = setTimeout(() => {
          sessionStorage.removeItem('vizion-order-confirmation');
          setSessionData(null);
          console.log('Order confirmation expired via timer');
        }, timeUntilCleanup);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [orderDetails]);

  // Action handlers
  // Move fetchOrderStatus function here to fix scope issue
  const fetchOrderStatus = useCallback(async () => {
    if (!orderId) {
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    try {
      const result = await orderService.getOrderStatus(orderId);
      
      if (result.success) {
        setOrderDetails(result.data);
        // Set order items from API response
        if (result.data.items && result.data.items.length > 0) {
          setOrderItems(result.data.items);
        }
      } else {
        // Handle order expiration specifically
        if (result.error.code === 'ORDER_EXPIRED') {
          // Clear session storage for expired order
          sessionStorage.removeItem('vizion-order-confirmation');
          setError(language === 'fr' 
            ? 'Le lien de confirmation de commande a expiré.' 
            : 'Order confirmation link has expired.'
          );
        } else {
          setError(result.error.message);
        }
      }
    } catch {
      // Don't set error if we have sessionStorage data
      if (!sessionData) {
        setError('Failed to load order details');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, sessionData, language]);

  useEffect(() => {
    fetchOrderStatus();
  }, [fetchOrderStatus]);

  const handleRefreshStatus = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchOrderStatus();
    setRefreshing(false);
  };

  // Declare variables at the top before any return statements
  const currentStatus = orderDetails?.status || 'pending';
  const progressSteps = getProgressSteps(currentStatus, language, orderDetails?.createdAt);
  const currentDate = new Date().toLocaleDateString((language === 'fr') ? 'fr-CA' : 'en-CA', {
    day: 'numeric',
    month: 'long', 
    year: 'numeric'
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'fr' ? 'Commande introuvable' : 'Order Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/order')}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            {language === 'fr' ? 'Retour aux commandes' : 'Back to Order'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-6">
      <div className="max-w-6xl mx-auto px-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN - Order Information (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-300 p-8 h-fit">
            
            {/* Success Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-green-100 border-2 border-green-600 rounded-full flex items-center justify-center">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-3">
                  {language === 'fr' ? 'Commande confirmée' : 'Order Confirmed'}
                </h1>
                <p className="text-gray-500 text-sm">
                  Order No: <span className="text-primary font-semibold bg-orange-50 border border-orange-200 px-3 py-1 rounded-lg uppercase">{orderNumber || orderDetails?.orderNumber || orderId?.substring(0, 8)?.toUpperCase()}</span>
                </p>
              </div>
            </div>
            
            {/* Order Details - Badge Style */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center py-2">
                <span className="text-gray-500 text-sm">{language === 'fr' ? 'Date' : 'Date'}</span>
                <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">{currentDate}</span>
              </div>
              
              <div className="flex items-center py-2">
                <span className="text-gray-500 text-sm">{language === 'fr' ? 'Client' : 'Customer'}</span>
                <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">{customerName}</span>
              </div>
              
              <div className="flex items-center py-2">
                <span className="text-gray-500 text-sm">{language === 'fr' ? 'Téléphone' : 'Phone'}</span>
                <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">{customerPhone}</span>
              </div>
              
              {customerEmail && (
                <div className="flex items-center py-2">
                  <span className="text-gray-500 text-sm">{language === 'fr' ? 'Courriel' : 'Email'}</span>
                  <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                  <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">{customerEmail}</span>
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="border-t border-gray-200 pt-6 mb-8">
              <h2 className="font-semibold text-gray-900 mb-4">
                {language === 'fr' ? 'Détails de la commande' : 'Order Details'}
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center py-2">
                  <span className="text-gray-500 text-sm">{language === 'fr' ? 'Méthode' : 'Method'}</span>
                  <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                  <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                    {(() => {
                      if (language === 'fr') {
                        switch (orderType) {
                          case 'dine_in': return 'Sur place';
                          case 'takeaway': return 'À emporter';
                          case 'delivery': return 'Livraison';
                          default: return 'À emporter';
                        }
                      } else {
                        switch (orderType) {
                          case 'dine_in': return 'Dine In';
                          case 'takeaway': return 'Takeaway';
                          case 'delivery': return 'Delivery';
                          default: return 'Takeaway';
                        }
                      }
                    })()}
                    {source === 'qr' && tableNumber && (
                      <span className="ml-2 text-xs text-gray-600">
                        ({zone === 'Screen' ? 'Screen' : `Table ${tableNumber}`})
                      </span>
                    )}
                  </span>
                </div>

                
                {/* Branch Information */}
                {orderDetails?.branch && (
                  <>
                    <div className="flex items-center py-2">
                      <span className="text-gray-500 text-sm">{t.orderTracking.branchName}</span>
                      <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                      <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                        {orderDetails.branch.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center py-2">
                      <span className="text-gray-500 text-sm">{t.orderTracking.branchAddress}</span>
                      <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                      <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg text-xs max-w-xs break-words text-right">
                        {orderDetails.branch.address}
                      </span>
                    </div>
                  </>
                )}
                
                <div className="flex items-center py-2">
                  <span className="text-gray-500 text-sm">{language === 'fr' ? 'Heure' : 'Time'}</span>
                  <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                  <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                    {new Date().toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Toronto'
                    })}
                  </span>
                </div>
                
                {/* Estimated Completion Time */}
                {orderDetails?.estimatedTime && orderDetails?.createdAt && (
                  <div className="flex items-center py-2">
                    <span className="text-gray-500 text-sm">
                      {t.orderTracking.completionTime}
                    </span>
                    <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                    <span className="font-medium text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-lg">
                      {formatEstimatedCompletionTime(orderDetails.estimatedTime, orderDetails.createdAt, language)}
                    </span>
                  </div>
                )}
                
                {/* Order Notes */}
                {orderNotes && (
                  <div className="flex items-center py-2">
                    <span className="text-gray-500 text-sm">
                      {language === 'fr' ? 'Note de commande' : 'Order Notes'}
                    </span>
                    <div className="flex-1 border-b border-dotted border-gray-300 mx-3"></div>
                    <span className="font-medium text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                      {orderNotes}
                    </span>
                  </div>
                )}

                {/* Delivery Address */}
                {deliveryAddress && orderType === 'delivery' && (
                  <div className="flex items-start py-2">
                    <span className="text-gray-500 text-sm mt-1">
                      {language === 'fr' ? 'Adresse de livraison' : 'Delivery Address'}
                    </span>
                    <div className="flex-1 border-b border-dotted border-gray-300 mx-3 mt-3"></div>
                    <div className="font-medium text-gray-900 bg-green-50 border border-green-200 px-3 py-2 rounded-lg max-w-sm">
                      <div className="text-sm">
                        <div>{deliveryAddress.streetAddress}</div>
                        {deliveryAddress.unitNumber && (
                          <div>Unit {deliveryAddress.unitNumber}</div>
                        )}
                        <div>{deliveryAddress.city}, {deliveryAddress.province} {deliveryAddress.postalCode}</div>
                        {deliveryAddress.buzzerCode && (
                          <div className="text-xs text-gray-600 mt-1">Buzzer: {deliveryAddress.buzzerCode}</div>
                        )}
                        {deliveryAddress.deliveryInstructions && (
                          <div className="text-xs text-gray-600 mt-1 italic">{deliveryAddress.deliveryInstructions}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Progress Timeline - Vertical on Mobile, Horizontal on Desktop */}
            <div className="pt-6 bg-gray-50 rounded-2xl mt-6">
              <div className="relative p-6">
                
                {/* Mobile Layout - Vertical */}
                <div className="md:hidden">
                  {progressSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === progressSteps.length - 1;
                    return (
                      <div key={step.key} className="relative">
                        <div className="flex items-center gap-4">
                          {/* Circle */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white transition-colors flex-shrink-0 ${
                            step.completed 
                              ? 'border-primary text-primary' 
                              : 'border-gray-300 text-gray-400'
                          }`}>
                            {step.completed ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              step.completed ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                              {step.label}
                            </p>
                            {step.time && (
                              <p className="text-xs text-gray-500 mt-1">
                                {step.time}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Vertical Line */}
                        {!isLast && (
                          <div className={`w-0.5 h-8 ml-5 mt-2 mb-2 transition-colors ${
                            step.completed ? 'bg-primary' : 'bg-gray-200'
                          }`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Layout - Horizontal */}
                <div className="hidden md:block">
                  <div className="flex justify-between items-start relative px-12">
                    {/* Progress Line */}
                    <div className="absolute top-6 left-[calc(12%+24px)] right-[calc(12%+24px)] h-0.5 bg-gray-200">
                      <div 
                        className="bg-primary h-full transition-all duration-500"
                        style={{ 
                          width: `${(progressSteps.filter(s => s.completed).length - 1) / (progressSteps.length - 1) * 100}%` 
                        }}
                      />
                    </div>
                    
                    {/* Progress Steps */}
                    {progressSteps.map((step) => {
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-col items-center relative z-10">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 bg-white transition-colors ${
                            step.completed 
                              ? 'border-primary text-primary' 
                              : 'border-gray-300 text-gray-400'
                          }`}>
                            {step.completed ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                          
                          <div className="mt-3 text-center">
                            <p className={`text-xs font-medium whitespace-nowrap ${
                              step.completed ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                              {step.label}
                            </p>
                            {step.time && (
                              <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                                {step.time}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Order Items & Summary (1/3 width) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Cart Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-6 h-fit">
              {/* Order Items */}
              <div className="mb-6">
                <div className="divide-y divide-dotted divide-gray-300">
                  {(orderItems.length > 0 ? orderItems : items).map((item, index) => (
                    <div key={item.id} className={`flex items-start gap-4 ${index === 0 ? 'pb-4' : 'py-4'}`}>
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base mb-1 leading-tight">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {item.quantity}
                            </span>
                            <span className="text-sm text-gray-400">×</span>
                            <span className="text-sm text-gray-600">
                              {language === 'fr' ? 
                                `${item.price.toFixed(2).replace('.', ',')} $` : 
                                `$${item.price.toFixed(2)}`
                              }
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {language === 'fr' ? 
                                `${(item.price * item.quantity).toFixed(2).replace('.', ',')} $` : 
                                `$${(item.price * item.quantity).toFixed(2)}`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comprehensive Order Summary */}
              <div className="border-t border-gray-200 pt-4">
                <div className="space-y-2 text-sm mb-4">
                  {/* Items Total */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {language === 'fr' ? 'Articles' : 'Items'}
                    </span>
                    <span className="font-medium text-gray-900">
                      {language === 'fr' ? 
                        `${itemsTotal.toFixed(2).replace('.', ',')} $` : 
                        `$${itemsTotal.toFixed(2)}`
                      }
                    </span>
                  </div>
                  
                  {/* Campaign Discount */}
                  {sessionData?.campaignDiscount && discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <TicketPercent className="h-4 w-4 text-green-600" />
                        {sessionData.campaignDiscount.code}
                      </span>
                      <span className="font-medium text-green-600">
                        {language === 'fr' ? 
                          `-${discountAmount.toFixed(2).replace('.', ',')} $` : 
                          `-$${discountAmount.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}
                  
                  {/* ✅ NEW: Tip shown AFTER items but BEFORE delivery fee (new Canada tax rules) */}
                  {sessionData?.tipDetails && tipAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        {language === 'fr' ? 'Pourboire' : 'Tip'}
                        <span className="text-xs text-gray-500">
                          ({sessionData.tipDetails.type === 'percentage' 
                            ? `${sessionData.tipDetails.value}%` 
                            : language === 'fr' ? 'fixe' : 'fixed'
                          })
                        </span>
                      </span>
                      <span className="font-medium text-gray-900">
                        {language === 'fr' ? 
                          `${tipAmount.toFixed(2).replace('.', ',')} $` : 
                          `$${tipAmount.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}
                  
                  {/* Delivery Fee - Enhanced with Free Delivery Support */}
                  {(deliveryFee > 0 || sessionData?.deliveryInfo?.isFree) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        {language === 'fr' ? 'Frais de livraison' : 'Delivery fee'}
                        {sessionData?.deliveryInfo?.isFree && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            {language === 'fr' ? 'GRATUIT!' : 'FREE!'}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {sessionData?.deliveryInfo?.isFree && sessionData?.deliveryInfo?.baseFee > 0 && (
                          <span className="text-gray-400 line-through text-sm">
                            {language === 'fr' ? 
                              `${sessionData.deliveryInfo.baseFee.toFixed(2).replace('.', ',')} $` : 
                              `$${sessionData.deliveryInfo.baseFee.toFixed(2)}`
                            }
                          </span>
                        )}
                        <span className={`font-medium ${sessionData?.deliveryInfo?.isFree ? 'text-green-600' : 'text-gray-900'}`}>
                          {language === 'fr' ? 
                            `${deliveryFee.toFixed(2).replace('.', ',')} $` : 
                            `$${deliveryFee.toFixed(2)}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Subtotal (including tip before taxes) */}
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-600">
                      {language === 'fr' ? 'Sous-total' : 'Subtotal'}
                    </span>
                    <span className="font-medium text-gray-900">
                      {language === 'fr' ? 
                        `${subtotalWithDeliveryAndTip.toFixed(2).replace('.', ',')} $` : 
                        `$${subtotalWithDeliveryAndTip.toFixed(2)}`
                      }
                    </span>
                  </div>
                  
                  {/* GST */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST</span>
                    <span className="font-medium text-gray-900">
                      {language === 'fr' ? 
                        `${gst.toFixed(2).replace('.', ',')} $` : 
                        `$${gst.toFixed(2)}`
                      }
                    </span>
                  </div>
                  
                  {/* QST */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">QST</span>
                    <span className="font-medium text-gray-900">
                      {language === 'fr' ? 
                        `${qst.toFixed(2).replace('.', ',')} $` : 
                        `$${qst.toFixed(2)}`
                      }
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {language === 'fr' ? 'Total' : 'Total'}
                    </span>
                    <div className="text-right">
                      {sessionData?.campaignDiscount && discountAmount > 0 ? (
                        <>
                          <span className="text-sm text-gray-500 line-through mr-2">
                            {language === 'fr' ? 
                              `${(total + discountAmount).toFixed(2).replace('.', ',')} $` : 
                              `$${(total + discountAmount).toFixed(2)}`
                            }
                          </span>
                          <br />
                        </>
                      ) : null}
                      <span className="font-bold text-2xl text-gray-900">
                        {language === 'fr' ? 
                          `${total.toFixed(2).replace('.', ',')} $` : 
                          `$${total.toFixed(2)}`
                        }
                      </span>
                    </div>
                  </div>
                  {sessionData?.campaignDiscount && discountAmount > 0 && (
                    <p className="text-sm text-green-600 text-right mt-1">
                      {language === 'fr' 
                        ? `Vous avez économisé ${discountAmount.toFixed(2).replace('.', ',')} $` 
                        : `You saved $${discountAmount.toFixed(2)}`
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons - Separate card in right column */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Check Status */}
                <button
                  onClick={handleRefreshStatus}
                  disabled={refreshing}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {language === 'fr' ? 'Vérifier statut' : 'Check Status'}
                </button>

                {/* New Order - Always visible */}
                <button
                  onClick={handleBackToMenu}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary border border-primary rounded-lg hover:opacity-90 transition-all"
                >
                  <Package className="h-4 w-4" />
                  {language === 'fr' ? 'Nouvelle commande' : 'New Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderConfirmationContentWrapper({ params }: { params: Promise<{ chainSlug: string }> }) {
  const [chainSlug, setChainSlug] = useState<string>('')
  
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setChainSlug(resolvedParams.chainSlug)
    }
    getParams()
  }, [params])
  
  if (!chainSlug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return <OrderConfirmationContent chainSlug={chainSlug} />
}

export default function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--primary]"></div>
      </div>
    }>
      <OrderConfirmationContentWrapper params={params} />
    </Suspense>
  );
}