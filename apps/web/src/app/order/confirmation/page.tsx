'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { orderService } from '@/services/order-service';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedTime: string;
  createdAt: string;
}

export default function OrderConfirmationPage() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');
  const message = searchParams.get('message');

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
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading order details...</p>
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
            {t.orderConfirmation?.errorTitle || 'Order Not Found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/order')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t.orderConfirmation?.backToOrder || 'Back to Order'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6 pt-12">
        {/* Success Icon and Title */}
        <div className="text-center mb-8">
          <div className="text-green-500 text-8xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t.orderConfirmation?.title || 'Order Confirmed!'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {message || t.orderConfirmation?.subtitle || 'Your order has been successfully placed'}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t.orderConfirmation?.orderDetails || 'Order Details'}
            </h2>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              #{orderNumber || orderDetails?.orderNumber}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t.orderConfirmation?.orderId || 'Order ID'}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {orderDetails?.orderId || orderId}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t.orderConfirmation?.status || 'Status'}
              </span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {orderDetails?.status || 'Preparing'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t.orderConfirmation?.estimatedTime || 'Estimated Time'}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {orderDetails?.estimatedTime || '20-30 minutes'}
              </span>
            </div>

            {orderDetails?.createdAt && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t.orderConfirmation?.orderTime || 'Order Time'}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(orderDetails.createdAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* What's Next Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            {t.orderConfirmation?.whatsNext || "What's Next?"}
          </h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-200">
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">🍳</span>
              {t.orderConfirmation?.step1 || 'Your order is being prepared'}
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">📱</span>
              {t.orderConfirmation?.step2 || 'You can track your order status anytime'}
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">🚗</span>
              {t.orderConfirmation?.step3 || 'We will notify you when ready for pickup/delivery'}
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/order/track?orderId=${orderId}`)}
            className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {t.orderConfirmation?.trackOrder || 'Track Your Order'}
          </button>
          
          <button
            onClick={() => router.push('/order')}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t.orderConfirmation?.placeAnother || 'Place Another Order'}
          </button>
        </div>

        {/* Contact Support */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t.orderConfirmation?.needHelp || 'Need help with your order?'}
          </p>
          <button
            onClick={() => window.location.href = 'tel:+1-800-RESTAURANT'}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            {t.orderConfirmation?.contactSupport || 'Contact Support'}
          </button>
        </div>
      </div>
    </div>
  );
}