"use client"

import { UtensilsCrossed } from "lucide-react"
import { StatCard } from "./stat-card"
import { useLanguage } from "@/contexts/language-context"

interface MenuItemsCardProps {
  total: number
  unavailable: number
}

export function MenuItemsCard({ total, unavailable }: MenuItemsCardProps) {
  const { language } = useLanguage()

  const subtitle = unavailable
    ? (language === 'fr' ? `${unavailable} non disponibles` : `${unavailable} unavailable`)
    : (language === 'fr' ? "Tous disponibles" : "All available")

  return (
    <StatCard
      title={language === 'fr' ? "Articles du Menu" : "Menu Items"}
      value={total}
      subtitle={subtitle}
      icon={UtensilsCrossed}
      href="/menu"
      linkText={language === 'fr' ? "Détails" : "Details"}
    />
  )
}
