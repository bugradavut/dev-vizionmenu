"use client"

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

export function OrderNotesSection() {
  const [notes, setNotes] = useState('')

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Other information
        </h3>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
          Optional
        </span>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="order-notes" className="text-sm font-medium text-foreground">
          Note for the order
        </label>
        <Textarea
          id="order-notes"
          placeholder="Ex: Put the sauce separately"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  )
}