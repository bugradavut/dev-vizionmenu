"use client"

import React from 'react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

export default function MenuCategoriesPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.navigation.categories}
        </h1>
        <p className="text-muted-foreground">
          {language === 'fr' 
            ? "Gérez les catégories de votre menu"
            : "Manage your menu categories"
          }
        </p>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        <p>{language === 'fr' ? 'Page des catégories - En cours de développement' : 'Categories page - Under development'}</p>
      </div>
    </div>
  )
}