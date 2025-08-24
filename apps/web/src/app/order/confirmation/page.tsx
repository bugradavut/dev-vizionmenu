'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { orderService } from '@/services/order-service';
import { useLanguage } from '@/contexts/language-context';
import { useCart } from '../contexts/cart-context';
import { Check, Package, CheckCircle2 } from 'lucide-react';

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedTime?: string;
  createdAt?: string;
  pricing?: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  items?: OrderItem[];
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

interface OrderSession {
  orderId: string;
  orderNumber?: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  items: OrderItem[];
  pricing: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  orderType?: string;
  source?: string;
  tableNumber?: number;
  zone?: string;
  timestamp?: number;
}

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

function OrderConfirmationContent() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [sessionData, setSessionData] = useState<OrderSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { items, clearCart } = useCart()
  
  const orderId = searchParams.get('orderId');

  // Load data from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('vizion-order-confirmation');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          
          // Check if data is not too old (10 minutes)
          const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
          if (data.timestamp && data.timestamp > tenMinutesAgo) {
            setSessionData(data);
            setOrderItems(data.items || []);
          } else {
            sessionStorage.removeItem('vizion-order-confirmation');
          }
        } catch {
          // Silently fail and continue without session data
        }
      }
    }
  }, []);

  // Use sessionStorage data with API fallback
  const apiSubtotal = orderDetails?.pricing?.subtotal || 0
  const apiTax = orderDetails?.pricing?.taxAmount || 0  
  const apiTotal = orderDetails?.pricing?.total || 0
  
  const subtotal = apiSubtotal || sessionData?.pricing?.subtotal || items.reduce((total, item) => total + (item.price * item.quantity), 0)
  const tax = apiTax || sessionData?.pricing?.taxAmount || subtotal * 0.13
  const total = apiTotal || sessionData?.pricing?.total || subtotal + tax
  
  // Extract customer info from sessionStorage with fallbacks
  const customerName = sessionData?.customerInfo?.name || 'Customer';
  const customerPhone = sessionData?.customerInfo?.phone || 'N/A';
  const customerEmail = sessionData?.customerInfo?.email || '';
  const orderType = sessionData?.orderType || 'takeaway';
  const source = sessionData?.source as 'qr' | 'web' || 'web';
  const tableNumber = sessionData?.tableNumber;
  const zone = sessionData?.zone;
  const orderNumber = sessionData?.orderNumber;

  // Clear cart when confirmation page loads (order is successful)
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Auto cleanup sessionStorage after 10 minutes
  useEffect(() => {
    if (sessionData && sessionData.timestamp) {
      const cleanupTime = sessionData.timestamp + (10 * 60 * 1000); // 10 minutes
      const timeUntilCleanup = cleanupTime - Date.now();
      
      if (timeUntilCleanup > 0) {
        const timeoutId = setTimeout(() => {
          sessionStorage.removeItem('vizion-order-confirmation');
          setSessionData(null);
        }, timeUntilCleanup);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [sessionData]);

  useEffect(() => {
    const fetchOrderStatus = async () => {
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
    };

    fetchOrderStatus();
  }, [orderId, sessionData, language]);

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

  const currentStatus = orderDetails?.status || 'pending';
  const progressSteps = getProgressSteps(currentStatus, language, orderDetails?.createdAt);
  const currentDate = new Date().toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
    day: 'numeric',
    month: 'long', 
    year: 'numeric'
  });

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

            {/* Delivery Information */}
            <div className="border-t border-gray-200 pt-6 mb-8">
              <h2 className="font-semibold text-gray-900 mb-4">
                {language === 'fr' ? 'Type de commande' : 'Order Type'}
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
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-300 p-6 h-fit">
            
            
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

            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {language === 'fr' ? 'Articles' : 'Items'}
                  </span>
                  <span className="font-medium text-gray-900">
                    {language === 'fr' ? 
                      `${subtotal.toFixed(2).replace('.', ',')} $` : 
                      `$${subtotal.toFixed(2)}`
                    }
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {language === 'fr' ? 'Taxe (TVH)' : 'Tax (HST)'}
                  </span>
                  <span className="font-medium text-gray-900">
                    {language === 'fr' ? 
                      `${tax.toFixed(2).replace('.', ',')} $` : 
                      `$${tax.toFixed(2)}`
                    }
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {language === 'fr' ? 'Total' : 'Total'}
                  </span>
                  <span className="font-bold text-2xl text-gray-900">
                    {language === 'fr' ? 
                      `${total.toFixed(2).replace('.', ',')} $` : 
                      `$${total.toFixed(2)}`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--primary]"></div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}