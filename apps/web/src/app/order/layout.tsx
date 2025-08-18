import { Metadata } from 'next'

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
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}