import { Metadata } from 'next'
import { LanguageProvider } from '@/contexts/language-context'

export const metadata: Metadata = {
  title: 'Order Menu | Vision Menu',
  description: 'Place your order from our delicious menu',
}

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider defaultLanguage="fr" storageKey="order-page-language">
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </LanguageProvider>
  )
}