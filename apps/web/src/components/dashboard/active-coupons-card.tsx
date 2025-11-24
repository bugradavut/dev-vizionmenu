"use client"

import { Tag } from "lucide-react"
import { StatCard } from "./stat-card"
import { useLanguage } from "@/contexts/language-context"

interface ActiveCouponsCardProps {
  count: number
  expiringCount: number
}

export function ActiveCouponsCard({ count, expiringCount }: ActiveCouponsCardProps) {
  const { language } = useLanguage()

  const subtitle = expiringCount
    ? (language === 'fr' ? `${expiringCount} expire bientôt` : `${expiringCount} expiring soon`)
    : (language === 'fr' ? "Aucun expiration proche" : "No expiring soon")

  return (
    <StatCard
      title={language === 'fr' ? "Coupons Actifs" : "Active Coupons"}
      value={count}
      subtitle={subtitle}
      icon={Tag}
      href="/campaigns/create"
      linkText={language === 'fr' ? "Détails" : "Details"}
    />
  )
}
