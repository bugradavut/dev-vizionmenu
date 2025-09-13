'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { orderService } from '@/services/order-service';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';
import { ArrowLeft, Clock, CheckCircle, Truck } from 'lucide-react';

interface OrderStatus {
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedTime: string;
  createdAt: string;
}

const statusConfig = {
  preparing: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-200'
  },
  ready: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200'
  },
  completed: {
    icon: Truck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200'
  }
};

function OrderTrackingContent() {
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    const fetchOrderStatus = async () => {
      if (!orderId) {
        setError('Order ID not provided');
        setLoading(false);
        return;
      }

      try {
        const result = await orderService.getOrderStatus(orderId);
        
        if (result.success) {
          setOrderStatus(result.data);
        } else {
          setError(result.error.message);
        }
      } catch {
        setError('Failed to load order status');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchOrderStatus, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading order status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t.orderTracking?.errorTitle || 'Unable to Load Order'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/order')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t.orderTracking?.backToOrder || 'Back to Order'}
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = orderStatus?.status || 'preparing';
  const StatusIcon = statusConfig[currentStatus as keyof typeof statusConfig]?.icon || Clock;
  const statusStyle = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.preparing;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6 pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.orderTracking?.back || 'Back'}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.orderTracking?.title || 'Track Your Order'}
          </h1>
        </div>

        {/* Order Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <div className={`${statusStyle.bgColor} rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4`}>
              <StatusIcon className={`h-10 w-10 ${statusStyle.color}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              #{orderStatus?.orderNumber}
            </h2>
            <div className={`inline-flex items-center px-4 py-2 rounded-full ${statusStyle.bgColor}`}>
              <span className={`text-sm font-medium ${statusStyle.textColor} capitalize`}>
                {currentStatus}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t.orderTracking?.orderPlaced || 'Order Placed'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {orderStatus?.createdAt && new Date(orderStatus.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                ['preparing', 'ready', 'completed'].includes(currentStatus) 
                  ? 'bg-blue-100 dark:bg-blue-900' 
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <Clock className={`h-4 w-4 ${
                  ['preparing', 'ready', 'completed'].includes(currentStatus)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400'
                }`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t.orderTracking?.preparing || 'Preparing'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.orderTracking?.estimatedTime || 'Estimated time'}: {orderStatus?.estimatedTime}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                ['ready', 'completed'].includes(currentStatus)
                  ? 'bg-green-100 dark:bg-green-900'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <CheckCircle className={`h-4 w-4 ${
                  ['ready', 'completed'].includes(currentStatus)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400'
                }`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t.orderTracking?.ready || 'Ready for Pickup/Delivery'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t.orderTracking?.contactTitle || 'Need Help?'}
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = 'tel:+1-800-RESTAURANT'}
              className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {t.orderTracking?.callRestaurant || 'Call Restaurant'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t.orderTracking?.callForUpdates || 'For order updates and questions'}
              </div>
            </button>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            {t.orderTracking?.refresh || 'Refresh Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <OrderTrackingContent />
    </Suspense>
  );
}