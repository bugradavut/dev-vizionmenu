"use client"

import React from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  cancelText: string
  variant?: 'default' | 'warning' | 'destructive'
  icon?: React.ReactNode
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'default',
  icon
}: ConfirmationDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconBg: 'bg-primary/10',
          iconColor: 'text-primary',
          confirmButton: 'bg-primary hover:bg-primary/90 text-white'
        }
      case 'destructive':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white'
        }
      default:
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmButton: 'bg-primary hover:bg-primary/90 text-white'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[90vw] sm:w-full p-0 gap-0 !fixed !bottom-4 !top-auto md:!top-4 md:!bottom-auto !left-1/2 !-translate-x-1/2 !translate-y-0">
        <div className="p-4">
          {/* Header with icon and close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${styles.iconBg}`}>
                <div className={styles.iconColor}>
                  {icon || <AlertTriangle className="h-3 w-3" />}
                </div>
              </div>
              <DialogTitle className="text-sm font-semibold text-gray-900">
                {title}
              </DialogTitle>
            </div>
          </div>

          {/* Description */}
          <DialogDescription className="text-xs text-gray-600 mb-4 leading-relaxed">
            {description}
          </DialogDescription>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={onClose}
              className="px-3 py-1.5 h-auto text-xs text-gray-600 hover:text-gray-800"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className={`px-3 py-1.5 h-auto text-xs ${styles.confirmButton}`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}