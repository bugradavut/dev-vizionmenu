"use client"

import { ShoppingCart } from "lucide-react"
import { StatCard } from "./stat-card"
import { useLanguage } from "@/contexts/language-context"

interface NewOrdersCardProps {
  count: number
  changePercent: number
  pendingCount: number
  sparkline: { value: number }[]
}

export function NewOrdersCard({ count, changePercent, pendingCount, sparkline }: NewOrdersCardProps) {
  const { language } = useLanguage()

  const subtitle = pendingCount
    ? (language === 'fr' ? `${pendingCount} en attente` : `${pendingCount} pending`)
    : (language === 'fr' ? "Depuis hier" : "Since yesterday")

  return (
    <StatCard
      title={language === 'fr' ? "Nouvelles Commandes" : "New Orders"}
      value={count}
      subtitle={subtitle}
      change={{
        value: Math.abs(changePercent),
        type: changePercent >= 0 ? "increase" : "decrease"
      }}
      icon={ShoppingCart}
      sparklineData={sparkline}
      href="/orders/live"
      linkText={language === 'fr' ? "Détails" : "Details"}
    />
  )
}
