"use client"

import { LanguageProvider } from '@/contexts/language-context'
import { CartContextProvider } from './contexts/cart-context'

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider defaultLanguage="fr" storageKey="order-page-language">
      <CartContextProvider>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </CartContextProvider>
    </LanguageProvider>
  )
}