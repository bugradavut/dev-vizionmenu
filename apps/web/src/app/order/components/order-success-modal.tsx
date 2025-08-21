"use client"

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, MapPin, Package, Download, ShoppingCart } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

interface OrderSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderData?: {
    orderId: string
    estimatedTime?: string
    orderType: 'dine_in' | 'takeout'
    tableNumber?: number
    zone?: string
    total: number
  }
  onPlaceAnother: () => void
  onDownloadReceipt?: () => void
}

export function OrderSuccessModal({
  open,
  onOpenChange,
  orderData,
  onPlaceAnother,
  onDownloadReceipt
}: OrderSuccessModalProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const handlePlaceAnother = () => {
    onOpenChange(false)
    onPlaceAnother()
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-0 gap-0 sm:w-auto sm:h-auto sm:max-w-lg sm:max-h-none sm:rounded-lg">
        {/* Order Success Content */}
        <div className="flex flex-col h-full bg-background sm:h-auto">
          {/* Success Header */}
          <div className="text-center p-8 sm:p-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t.orderPage.orderSuccess.title}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t.orderPage.orderSuccess.message}
            </p>
          </div>

          {/* Order Details */}
          {orderData && (
            <div className="px-8 pb-6 sm:px-6 space-y-4">
              {/* Order ID */}
              <div className="bg-muted rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                  <p className="text-lg font-mono font-semibold text-foreground">
                    #{orderData.orderId}
                  </p>
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                {/* Order Type */}
                <div className="flex items-center gap-3">
                  {orderData.orderType === 'dine_in' ? (
                    <MapPin className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Package className="w-5 h-5 text-orange-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {orderData.orderType === 'dine_in' ? t.orderPage.orderType.dineIn : t.orderPage.orderType.takeout}
                    </p>
                    {orderData.orderType === 'dine_in' && orderData.tableNumber && (
                      <p className="text-sm text-muted-foreground">
                        {orderData.zone 
                          ? `${t.orderPage.qrDineIn.tableNumber} ${orderData.tableNumber} - ${t.orderPage.qrDineIn.zone} ${orderData.zone}`
                          : `${t.orderPage.qrDineIn.tableNumber} ${orderData.tableNumber}`
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* Estimated Time */}
                {orderData.estimatedTime && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Estimated Ready Time</p>
                      <p className="text-sm text-muted-foreground">{orderData.estimatedTime}</p>
                    </div>
                  </div>
                )}

                {/* Order Total */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-medium text-foreground">{t.orderPage.pricing.total}</span>
                  <span className="font-semibold text-foreground">
                    {language === 'fr' ? `${orderData.total.toFixed(2)} $` : `$${orderData.total.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Order Status */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                    Order Status: <span className="font-bold">Confirmed</span>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {orderData.orderType === 'dine_in' 
                      ? "Your order is being prepared and will be served to your table"
                      : "Your order is being prepared and will be ready for pickup"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-8 sm:p-6 space-y-3 mt-auto sm:mt-0">
            <Button
              onClick={handlePlaceAnother}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {t.orderPage.orderSuccess.placeAnother}
            </Button>

            {onDownloadReceipt && (
              <Button
                variant="outline"
                onClick={onDownloadReceipt}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full text-muted-foreground"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}