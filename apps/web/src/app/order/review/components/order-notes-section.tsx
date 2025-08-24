"use client"

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

interface OrderNotesSectionProps {
  value?: string
  onChange?: (notes: string) => void
}

export function OrderNotesSection({ value = '', onChange }: OrderNotesSectionProps) {
  const [notes, setNotes] = useState(value)
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  useEffect(() => {
    setNotes(value)
  }, [value])

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    onChange?.(newNotes)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t.orderPage.review.otherInformation || "Other information"}
        </h3>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">
          {t.orderPage.review.optional || "Optional"}
        </span>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="order-notes" className="text-sm font-medium text-foreground">
          {t.orderPage.review.noteForOrder || "Note for the order"}
        </label>
        <Textarea
          id="order-notes"
          placeholder={t.orderPage.review.notePlaceholder || "Ex: Put the sauce separately"}
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          className="resize-none"
          maxLength={500}
        />
      </div>
    </div>
  )
}