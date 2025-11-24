"use client"

import { DollarSign } from "lucide-react"
import { StatCard } from "./stat-card"
import { useLanguage } from "@/contexts/language-context"

interface TodaysSalesCardProps {
  total: number
  changePercent: number
  sparkline: { value: number }[]
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2
  }).format(value)
}

export function TodaysSalesCard({ total, changePercent, sparkline }: TodaysSalesCardProps) {
  const { language } = useLanguage()

  return (
    <StatCard
      title={language === 'fr' ? "Ventes du Jour" : "Today's Sales"}
      value={formatCurrency(total)}
      subtitle={language === 'fr' ? "Depuis hier" : "Since yesterday"}
      change={{
        value: Math.abs(changePercent),
        type: changePercent >= 0 ? "increase" : "decrease"
      }}
      icon={DollarSign}
      sparklineData={sparkline}
      href="/reports/analytics"
      linkText={language === 'fr' ? "Détails" : "Details"}
    />
  )
}
