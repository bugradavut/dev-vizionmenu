"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'

interface WarningToastProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  cancelText: string
  icon?: React.ReactNode
}

export function WarningToast({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  icon
}: WarningToastProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[99999]" onClick={onClose} />

      {/* Toast Container - Responsive positioning */}
      <div className="fixed top-0 md:top-0 bottom-0 md:bottom-auto left-0 right-0 z-[99999] flex justify-center md:pt-4 px-4 items-end md:items-start pb-4 md:pb-0">
        <div className="bg-white rounded-xl md:rounded-xl rounded-b-none md:rounded-b-xl shadow-2xl border border-gray-200 max-w-md w-full mx-auto animate-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <div className="text-amber-600">
                  {icon || <AlertTriangle className="h-5 w-5" />}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {description}
            </p>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-4 py-2"
              >
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white"
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}