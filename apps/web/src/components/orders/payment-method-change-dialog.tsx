"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, Wallet, RefreshCw, XCircle } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { paymentMethodChangeService } from "@/services/payment-method-change.service"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

interface PaymentMethodChangeDialogProps {
  orderId: string
  currentPaymentMethod: string
  orderNumber: string
  totalAmount?: number
  onSuccess?: () => void
  onOpenChange?: (open: boolean) => void
}

export function PaymentMethodChangeDialog({
  orderId,
  currentPaymentMethod,
  orderNumber,
  totalAmount,
  onSuccess,
  onOpenChange: externalOnOpenChange
}: PaymentMethodChangeDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { language } = useLanguage()
  const t = (translations[language] || translations.en).orderDetail

  const paymentMethods = [
    { value: 'cash', label: t.cashLabel },
    { value: 'card', label: t.cardLabel },
    { value: 'online', label: t.onlineLabel }
  ]

  const availableMethods = paymentMethods.filter(method => {
    // Same payment method - filter out
    if (method.value === currentPaymentMethod) return false

    // Cash/Card → Online not allowed (illogical - customer already at counter)
    if ((currentPaymentMethod === 'cash' || currentPaymentMethod === 'card') && method.value === 'online') {
      return false
    }

    return true
  })

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    externalOnOpenChange?.(newOpen)
    if (!newOpen) {
      setTimeout(() => {
        setSelectedMethod('')
        setError(null)
        setSuccess(false)
        setShowConfirm(false)
      }, 300)
    }
  }

  const handleMethodSelect = (value: string) => {
    setSelectedMethod(value)
    setError(null)
  }

  const handleNext = () => {
    if (!selectedMethod) {
      setError(t.selectPaymentMethod)
      return
    }

    if ((currentPaymentMethod === 'cash' || currentPaymentMethod === 'card') && selectedMethod === 'online') {
      setError('Cannot change from counter payment to online payment')
      return
    }

    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!selectedMethod) return

    setLoading(true)
    setError(null)

    try {
      await paymentMethodChangeService.changePaymentMethod(
        orderId,
        selectedMethod as 'cash' | 'card' | 'online',
        'customer_request'
      )

      setSuccess(true)
      setShowConfirm(false)

      setTimeout(() => {
        onSuccess?.()
        handleOpenChange(false)
      }, 2000)

    } catch (err) {
      console.error('Error changing payment method:', err)
      setError(err instanceof Error ? err.message : 'Failed to change payment method')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const found = paymentMethods.find(m => m.value === method)
    return found ? found.label : method
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
        >
          <Wallet className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        {!showConfirm && !success && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {t.changePaymentMethod}
              </DialogTitle>
              <DialogDescription className="text-sm">
                #{orderNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Payment Method */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {t.currentPayment}
                </Label>
                <div className="p-3 bg-gray-50 border rounded-md">
                  <span className="text-sm font-medium text-gray-900">
                    {getPaymentMethodLabel(currentPaymentMethod)}
                  </span>
                </div>
              </div>

              {/* New Payment Method */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {t.newPayment}
                </Label>
                <RadioGroup value={selectedMethod} onValueChange={handleMethodSelect}>
                  <div className="grid grid-cols-2 gap-2">
                    {availableMethods.map((method) => (
                      <div
                        key={method.value}
                        className={`flex items-center space-x-3 p-3 border rounded-md transition-colors ${
                          selectedMethod === method.value
                            ? 'bg-orange-50 border-orange-200'
                            : 'hover:bg-orange-50 hover:border-orange-200'
                        }`}
                      >
                        <RadioGroupItem value={method.value} id={method.value} />
                        <Label
                          htmlFor={method.value}
                          className="flex-1 cursor-pointer text-sm font-medium"
                        >
                          {method.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="text-sm"
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedMethod}
                className="bg-orange-600 hover:bg-orange-700 text-sm"
              >
                {t.update}
              </Button>
            </DialogFooter>
          </>
        )}

        {showConfirm && !success && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {t.confirmChange}
              </DialogTitle>
              <DialogDescription className="text-sm">
                #{orderNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2 p-4 bg-gray-50 border rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.orderAmount}:</span>
                  <span className="font-medium">${(totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.currentMethod}:</span>
                  <span className="font-medium">{getPaymentMethodLabel(currentPaymentMethod)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.newMethod}:</span>
                  <span className="font-medium text-orange-600">{getPaymentMethodLabel(selectedMethod)}</span>
                </div>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-xs text-orange-800">
                  <strong>{t.cannotUndo}</strong>
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="text-sm"
              >
                {t.back}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t.processing}
                  </div>
                ) : (
                  t.confirmChange
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {success && (
          <div className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t.paymentMethodChanged}
                </h3>
                <p className="text-sm text-gray-600">
                  {t.changeSuccessDesc}
                </p>
                <p className="text-xs text-gray-500">
                  {t.websrmQueued}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
