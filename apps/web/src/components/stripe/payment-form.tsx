"use client"

import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Enhanced payment error handling with retry suggestions
function getPaymentErrorInfo(error: { code?: string; message?: string }, language: string, retryCount: number) {
  const isRetryableError = error.code ? ['card_declined', 'insufficient_funds', 'processing_error', 'rate_limit'].includes(error.code) : false
  const maxRetries = 3
  
  let message = error.message || (language === 'fr' ? 'Erreur de paiement' : 'Payment error')
  let canRetry = isRetryableError && retryCount < maxRetries
  let suggestion = ''

  // Handle specific error codes with localized messages and suggestions
  switch (error.code) {
    case 'card_declined':
      message = language === 'fr' ? 'Carte déclinée par votre banque' : 'Card declined by your bank'
      suggestion = language === 'fr' 
        ? 'Vérifiez vos informations ou utilisez une autre carte' 
        : 'Please check your card details or try a different card'
      break
    case 'insufficient_funds':
      message = language === 'fr' ? 'Fonds insuffisants' : 'Insufficient funds'
      suggestion = language === 'fr' 
        ? 'Vérifiez votre solde ou utilisez une autre carte' 
        : 'Please check your balance or use a different card'
      break
    case 'incorrect_cvc':
      message = language === 'fr' ? 'Code de sécurité incorrect' : 'Incorrect security code'
      suggestion = language === 'fr' 
        ? 'Vérifiez le code CVC au dos de votre carte' 
        : 'Please check the CVC code on the back of your card'
      break
    case 'expired_card':
      message = language === 'fr' ? 'Carte expirée' : 'Card expired'
      suggestion = language === 'fr' 
        ? 'Utilisez une carte valide' 
        : 'Please use a valid card'
      canRetry = false
      break
    case 'processing_error':
      message = language === 'fr' ? 'Erreur de traitement' : 'Processing error'
      suggestion = language === 'fr' 
        ? 'Veuillez réessayer dans quelques instants' 
        : 'Please try again in a few moments'
      break
    case 'rate_limit':
      message = language === 'fr' ? 'Trop de tentatives' : 'Too many attempts'
      suggestion = language === 'fr' 
        ? 'Veuillez attendre quelques minutes avant de réessayer' 
        : 'Please wait a few minutes before trying again'
      break
  }

  return {
    message: `${message}${suggestion ? ` - ${suggestion}` : ''}`,
    canRetry,
    retryCount,
    maxRetries
  }
}

interface PaymentFormProps {
  clientSecret: string
  amount: number
  onPaymentSuccess: (paymentIntentId: string) => void
  onPaymentError: (error: string) => void
  isProcessing?: boolean
  customerEmail?: string
  language?: 'en' | 'fr'
}

interface CheckoutFormProps {
  clientSecret: string
  amount: number
  onPaymentSuccess: (paymentIntentId: string) => void
  onPaymentError: (error: string) => void
  isProcessing?: boolean
  customerEmail?: string
  language?: 'en' | 'fr'
}

function CheckoutForm({ 
  clientSecret, 
  amount, 
  onPaymentSuccess, 
  onPaymentError, 
  isProcessing = false,
  customerEmail 
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { language } = useLanguage()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !clientSecret || isSubmitting || isProcessing) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    const card = elements.getElement(CardElement)
    if (!card) {
      setError(language === 'fr' ? 'Élément de carte non trouvé' : 'Card element not found')
      setIsSubmitting(false)
      return
    }

    try {
      // Real Stripe payment processing
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            email: customerEmail,
          },
        }
      })

      if (result.error) {
        // Payment failed - handle different error types
        const stripeError = result.error
        setRetryCount(prev => prev + 1)
        
        const errorInfo = getPaymentErrorInfo(stripeError, language, retryCount)
        setError(errorInfo.message)
        onPaymentError(errorInfo.message)
      } else if (result.paymentIntent?.status === 'succeeded') {
        // Payment succeeded
        setIsComplete(true)
        setRetryCount(0)
        onPaymentSuccess(result.paymentIntent.id)
      } else {
        // Payment in unexpected state
        const errorMessage = language === 'fr' 
          ? 'État de paiement inattendu' 
          : 'Unexpected payment state'
        setError(errorMessage)
        onPaymentError(errorMessage)
      }
    } catch (err) {
      setRetryCount(prev => prev + 1)
      const errorMessage = err instanceof Error ? err.message : 
        (language === 'fr' ? 'Erreur de paiement' : 'Payment error')
      setError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setRetryCount(0)
    // Clear the card element to allow new input
    const card = elements?.getElement(CardElement)
    if (card) {
      card.clear()
    }
  }

  const handleCardChange = (event: { error?: { message: string } }) => {
    if (event.error) {
      setError(event.error.message)
    } else {
      setError(null)
    }
  }

  // Card element styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
        iconColor: '#6b7280',
      },
      invalid: {
        color: '#dc2626',
        iconColor: '#dc2626',
      },
    },
    hidePostalCode: true, // Canadian postal code handled separately if needed
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Amount Display */}
      <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">
          {language === 'fr' ? 'Montant à payer' : 'Amount to Pay'}
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {language === 'fr' 
            ? `${amount.toFixed(2).replace('.', ',')} $ CAD`
            : `$${amount.toFixed(2)} CAD`
          }
        </p>
      </div>

      {/* Card Input Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">
            {language === 'fr' ? 'Informations de carte' : 'Card Information'}
          </h3>
        </div>
        
        <div className="p-4 border border-gray-300 rounded-lg bg-white">
          <CardElement 
            options={cardElementOptions}
            onChange={handleCardChange}
          />
        </div>
        
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          {language === 'fr' 
            ? 'Vos informations de paiement sont sécurisées par Stripe'
            : 'Your payment information is secured by Stripe'
          }
        </div>
      </div>

      {/* Error Display with Retry Option */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>{error}</div>
            {retryCount > 0 && retryCount < 3 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs">
                  {language === 'fr' 
                    ? `Tentative ${retryCount}/3` 
                    : `Attempt ${retryCount}/3`}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="h-6 px-2 text-xs"
                >
                  {language === 'fr' ? 'Réessayer' : 'Try Again'}
                </Button>
              </div>
            )}
            {retryCount >= 3 && (
              <div className="pt-2 text-xs text-muted-foreground">
                {language === 'fr' 
                  ? 'Limite de tentatives atteinte. Contactez votre banque ou utilisez une autre carte.'
                  : 'Maximum attempts reached. Please contact your bank or use a different card.'}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Display */}
      {isComplete && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {language === 'fr' ? 'Paiement réussi!' : 'Payment successful!'}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || !elements || isSubmitting || isProcessing || isComplete || (retryCount >= 3 && !!error)}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isSubmitting || isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {language === 'fr' ? 'Traitement...' : 'Processing...'}
          </>
        ) : isComplete ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Paiement réussi' : 'Payment Complete'}
          </>
        ) : error && retryCount > 0 && retryCount < 3 ? (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Réessayer le paiement' : 'Retry Payment'}
          </>
        ) : error && retryCount >= 3 ? (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Paiement échoué' : 'Payment Failed'}
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            {language === 'fr' 
              ? `Payer ${amount.toFixed(2).replace('.', ',')} $`
              : `Pay $${amount.toFixed(2)}`
            }
          </>
        )}
      </Button>

      {/* Security Notice */}
      <div className="text-xs text-center text-gray-500">
        {language === 'fr' 
          ? 'Paiement sécurisé traité par Stripe. Aucune information de carte n\'est stockée.'
          : 'Secure payment processed by Stripe. No card information is stored.'
        }
      </div>
    </form>
  )
}

export function StripePaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  )
}

export default StripePaymentForm