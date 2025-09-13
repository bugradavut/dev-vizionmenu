"use client"

import React from 'react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

export default function MenuItemsPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.navigation.items}
        </h1>
        <p className="text-muted-foreground">
          {language === 'fr' 
            ? "Gérez les articles de votre menu"
            : "Manage your menu items"
          }
        </p>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        <p>{language === 'fr' ? 'Page des articles - En cours de développement' : 'Items page - Under development'}</p>
      </div>
    </div>
  )
}