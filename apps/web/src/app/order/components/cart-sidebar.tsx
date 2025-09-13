"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Minus, Trash2, ShoppingBag, Loader2, Utensils, Bike, Clock, Check } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { useOrderContext } from '../contexts/order-context'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { useResponsiveClasses } from '@/hooks/use-responsive'
import { getCustomerBranchSettings, type TimingSettings } from '@/services/customer-branch-settings.service'
import { useDeliveryFee } from '@/hooks/use-delivery-fee'


export function CartSidebar() {
  const router = useRouter()
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    subtotal, 
    tax, 
    total,
    preOrder 
  } = useCart()
  
  const { isQROrder, tableNumber, zone, source, branchId, chainSlug } = useOrderContext()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // Centralized responsive state
  const responsiveClasses = useResponsiveClasses()
  
  const [isNavigating, setIsNavigating] = useState(false)
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false)
  const [selectedOrderType, setSelectedOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>(
    isQROrder ? 'dine_in' : 'takeaway'
  )
  const [timingSettings, setTimingSettings] = useState<TimingSettings | null>(null)
  
  // Fetch delivery fee and free delivery threshold for free delivery promotion
  const { deliveryFee, freeDeliveryThreshold } = useDeliveryFee({
    branchId: branchId || undefined,
    enabled: !!branchId
  })

  // Load branch timing settings
  useEffect(() => {
    const loadTimingSettings = async () => {
      if (branchId) {
        try {
          const branchSettings = await getCustomerBranchSettings(branchId)
          setTimingSettings(branchSettings.settings.timingSettings)
        } catch (error) {
          console.warn('Failed to load branch timing settings:', error)
        }
      }
    }
    
    loadTimingSettings()
  }, [branchId])

  // Calculate order ready time
  const calculateOrderReadyTime = (orderType: 'dine_in' | 'takeaway' | 'delivery') => {
    if (!timingSettings) return null
    
    try {
      const kitchenTime = (timingSettings.baseDelay || 20) + (timingSettings.temporaryBaseDelay || 0)
      
      let totalMinutes: number
      if (orderType === 'delivery') {
        const deliveryTime = (timingSettings.deliveryDelay || 15) + (timingSettings.temporaryDeliveryDelay || 0)
        totalMinutes = Math.max(10, kitchenTime + deliveryTime)
      } else {
        totalMinutes = Math.max(5, kitchenTime)
      }
      
      // Calculate completion time
      const now = new Date()
      const readyTime = new Date(now.getTime() + totalMinutes * 60 * 1000)
      
      // Format time
      const timeString = readyTime.toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Toronto'
      })
      
      return { timeString, totalMinutes }
    } catch (error) {
      console.warn('Error calculating order ready time:', error)
      return null
    }
  }

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
    } else {
      updateQuantity(itemId, newQuantity)
    }
  }

  const handleCheckoutClick = () => {
    // Simple validation: just check if cart has items
    if (items.length === 0) {
      return
    }
    
    // Open order type selection modal
    setShowOrderTypeModal(true)
  }

  const handleOrderTypeConfirm = async () => {
    // Set loading state
    setIsNavigating(true)
    setShowOrderTypeModal(false)
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Preserve URL parameters and add selected order type
    const searchParams = new URLSearchParams()
    if (source) searchParams.set('source', source)
    if (branchId) searchParams.set('branch', branchId)
    if (tableNumber) searchParams.set('table', tableNumber.toString())
    if (zone) searchParams.set('zone', zone)
    searchParams.set('orderType', selectedOrderType)
    
    // Find chainSlug - first try from context, then from localStorage
    let effectiveChainSlug = chainSlug
    
    if (!effectiveChainSlug && branchId) {
      // Try to find chainSlug from localStorage branch selections
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('selected-branch-')) {
            const branchData = JSON.parse(localStorage.getItem(key) || '{}')
            if (branchData.id === branchId) {
              effectiveChainSlug = key.replace('selected-branch-', '')
              break
            }
          }
        }
      } catch (error) {
        console.error('Error finding chain slug:', error)
      }
    }
    
    // Navigate with chainSlug (required for new architecture)
    if (!effectiveChainSlug) {
      throw new Error('Chain slug is required for review page')
    }
    
    const reviewUrl = `/order/${effectiveChainSlug}/review?${searchParams.toString()}`
    router.push(reviewUrl)
    
    // Reset loading state after navigation
    setTimeout(() => setIsNavigating(false), 500)
  }



  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Order Ready Time Header - Always visible */}
        <div className={`${responsiveClasses.padding.section} pb-0 pt-4`}>
          {(() => {
            // If pre-order is scheduled, show scheduled time instead of estimated time
            if (preOrder.isPreOrder && preOrder.scheduledDate && preOrder.scheduledTime) {
              // Format the scheduled date
              let dateDisplay = '';
              if (preOrder.scheduledDate === 'today') {
                dateDisplay = language === 'fr' ? "Aujourd'hui" : 'Today';
              } else if (preOrder.scheduledDate === 'tomorrow') {
                dateDisplay = language === 'fr' ? 'Demain' : 'Tomorrow';
              } else {
                // Format actual date
                const date = new Date(preOrder.scheduledDate);
                dateDisplay = date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                });
              }

              return (
                <Card className="bg-green-50 border-green-200 p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-green-600 font-medium">
                        {language === 'fr' ? 'PROGRAMMÉ POUR' : 'ORDER SCHEDULED FOR'}
                      </div>
                      <div className="text-lg font-bold text-green-900">
                        {dateDisplay} • {preOrder.scheduledTime}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            }

            // Default behavior - show estimated ready time
            const readyTimeInfo = calculateOrderReadyTime(selectedOrderType)
            if (!readyTimeInfo) return null
            
            return (
              <Card className="bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      {t.orderPage.orderReadyFor}
                    </div>
                    <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      {readyTimeInfo.timeString} <span className="text-sm font-normal">({readyTimeInfo.totalMinutes} min)</span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })()}
        </div>

        {/* Cart Items or Empty State */}
      <div className="flex-1 overflow-y-auto pb-[100px]">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center pt-8">
            <div className="text-center px-6">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t.orderPage.cart.empty}</h3>
              <p className="text-base text-muted-foreground/80 leading-relaxed">{t.orderPage.cart.emptyMessage}</p>
              
              {/* ✅ NEW: Free delivery promo for empty cart (web users) */}
              {source === 'web' && freeDeliveryThreshold > 0 && deliveryFee > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                        <Bike className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-lg font-bold text-green-700">
                        {language === 'fr' ? 'LIVRAISON GRATUITE' : 'FREE DELIVERY'}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      {language === 'fr' 
                        ? `Sur les commandes de ${freeDeliveryThreshold.toFixed(2)} $+`
                        : `On orders $${freeDeliveryThreshold.toFixed(2)}+`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`${responsiveClasses.padding.section} space-y-3`}>
            {/* Cart Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id} className={responsiveClasses.padding.card}>
                  <div className="flex items-start gap-3">
                    {/* Item Image */}
                    <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <span className="text-muted-foreground text-xs">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-base text-foreground line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'fr' ? `${item.price.toFixed(2)} $ ${t.orderPage.cart.each}` : `$${item.price.toFixed(2)} each`}
                      </p>
                      
                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {t.orderPage.cart.note}: {item.notes}
                        </p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-8 h-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-10 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-8 h-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Remove Button - Back to original position with styling */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 p-0 text-red-600 border-red-200 bg-red-50 hover:text-red-700 hover:bg-red-100 hover:border-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* ✅ NEW: Free delivery promotion for non-empty cart (web users) */}
            {source === 'web' && freeDeliveryThreshold > 0 && deliveryFee > 0 && (
              <div className="mt-4">
                {(() => {
                  const currentSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const isEligibleForFree = currentSubtotal >= freeDeliveryThreshold;
                  const amountNeeded = freeDeliveryThreshold - currentSubtotal;
                  
                  if (!isEligibleForFree) {
                    // Show progress bar for free delivery
                    return (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-blue-700">
                              {language === 'fr' 
                                ? `Gratuite à ${freeDeliveryThreshold.toFixed(2)} $`
                                : `Free delivery at $${freeDeliveryThreshold.toFixed(2)}`
                              }
                            </p>
                            <p className="text-sm text-blue-600">
                              {language === 'fr' 
                                ? `${amountNeeded.toFixed(2)} $ restant`
                                : `$${amountNeeded.toFixed(2)} to go`
                              }
                            </p>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min((currentSubtotal / freeDeliveryThreshold) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Show completed state with green color and check mark
                    return (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-green-700">
                              {language === 'fr' 
                                ? `Livraison gratuite`
                                : `Free delivery`
                              }
                            </p>
                            <div className="flex items-center gap-1 text-green-600">
                              <Check className="w-4 h-4" />
                              <p className="text-sm font-medium">
                                {language === 'fr' ? 'Éligible' : 'Applied'}
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full w-full transition-all duration-500"></div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}

          </div>
        )}

        {/* Customer Info Section - Inside Scrollable Area */}
        {items.length > 0 && (
          <div className={`${responsiveClasses.padding.section} space-y-3`}>
            {/* Order Summary */}
            <Card className={`${responsiveClasses.padding.card} bg-muted`}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t.orderPage.pricing.subtotal}</span>
                <span>{language === 'fr' ? `${subtotal.toFixed(2)} $` : `$${subtotal.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.orderPage.pricing.tax}</span>
                <span>{language === 'fr' ? `${tax.toFixed(2)} $` : `$${tax.toFixed(2)}`}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>{t.orderPage.pricing.total}</span>
                <span>{language === 'fr' ? `${total.toFixed(2)} $` : `$${total.toFixed(2)}`}</span>
              </div>
            </div>
          </Card>


          </div>
        )}
      </div>

      {/* Sticky Checkout Footer */}
      <div className="border-t border-border bg-card p-4 flex-shrink-0 absolute bottom-0 w-full">
        <Button
          onClick={handleCheckoutClick}
          disabled={isNavigating || items.length === 0}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {items.length === 0 
            ? t.orderPage.checkout.checkout
            : isNavigating
              ? <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              : (language === 'fr' ? `${t.orderPage.checkout.checkout} - ${total.toFixed(2)} $` : `${t.orderPage.checkout.checkout} - $${total.toFixed(2)}`)
          }
        </Button>
      </div>
    </div>
    
    {/* Order Type Selection Modal */}
    <Dialog open={showOrderTypeModal} onOpenChange={setShowOrderTypeModal}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {language === 'fr' ? 'Type de commande' : 'Order Type'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600 text-center mb-6">
            {language === 'fr' 
              ? 'Comment souhaitez-vous recevoir votre commande?' 
              : 'How would you like to receive your order?'
            }
          </p>
          
          <div className="space-y-3">
            {/* QR Users: Dine In + Takeaway */}
            {isQROrder ? (
              <>
                <button
                  onClick={() => setSelectedOrderType('dine_in')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedOrderType === 'dine_in'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {language === 'fr' ? 'Sur place' : 'Dine In'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {language === 'fr' 
                          ? 'Servir directement à votre table' 
                          : 'Served directly to your table'
                        }
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOrderType === 'dine_in' ? 'border-orange-500' : 'border-gray-300'
                    }`}>
                      {selectedOrderType === 'dine_in' && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedOrderType('takeaway')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedOrderType === 'takeaway'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {language === 'fr' ? 'À emporter' : 'Takeaway'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {language === 'fr' 
                          ? 'Récupérer au comptoir' 
                          : 'Pick up at counter'
                        }
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOrderType === 'takeaway' ? 'border-orange-500' : 'border-gray-300'
                    }`}>
                      {selectedOrderType === 'takeaway' && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              </>
            ) : (
              /* Web Users: Takeaway + Delivery */
              <>
                <button
                  onClick={() => setSelectedOrderType('takeaway')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedOrderType === 'takeaway'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {language === 'fr' ? 'À emporter' : 'Takeaway'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {language === 'fr' 
                          ? 'Récupérer au restaurant' 
                          : 'Pick up at restaurant'
                        }
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOrderType === 'takeaway' ? 'border-orange-500' : 'border-gray-300'
                    }`}>
                      {selectedOrderType === 'takeaway' && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedOrderType('delivery')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedOrderType === 'delivery'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Bike className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {language === 'fr' ? 'Livraison' : 'Delivery'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {language === 'fr' 
                          ? 'Livrer à votre adresse' 
                          : 'Deliver to your address'
                        }
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOrderType === 'delivery' ? 'border-orange-500' : 'border-gray-300'
                    }`}>
                      {selectedOrderType === 'delivery' && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>

          <div className="pt-4 space-y-2">
            <Button
              onClick={handleOrderTypeConfirm}
              disabled={isNavigating}
              className="w-full h-12"
              size="lg"
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'fr' ? 'Chargement...' : 'Loading...'}
                </>
              ) : (
                language === 'fr' ? 'Continuer' : 'Continue'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowOrderTypeModal(false)}
              disabled={isNavigating}
              className="w-full"
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}