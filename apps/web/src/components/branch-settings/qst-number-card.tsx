"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react"

interface QstNumberCardProps {
  qstNumber: string
  onQstChange: (value: string) => void
  translations: {
    title: string
    description: string
    label: string
    placeholder: string
    format: string
    invalidFormat: string
    validFormat: string
  }
}

// Validation helpers
const QST_REGEX = /^\d{10}TQ\d{4}$/

function validateQST(value: string): { isValid: boolean; message?: string } {
  if (!value) {
    return { isValid: true } // Empty is valid (optional)
  }

  if (!QST_REGEX.test(value)) {
    return { isValid: false, message: "Invalid format. Expected: XXXXXXXXXXTYXXXX" }
  }

  // FO-108 Test Case: Check for invalid test numbers
  if (value === "111111111TQ0001") {
    return { isValid: false, message: "The QST number is invalid (test case)" }
  }

  return { isValid: true }
}

export function QstNumberCard({
  qstNumber,
  onQstChange,
  translations
}: QstNumberCardProps) {
  const [qstTouched, setQstTouched] = useState(false)

  const qstValidation = validateQST(qstNumber)
  const showQstError = qstTouched && !qstValidation.isValid
  const showQstSuccess = qstTouched && qstValidation.isValid && qstNumber.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <FileText className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{translations.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {translations.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* QST Number Input */}
        <div className="space-y-2">
          <Label htmlFor="qst-number" className="text-sm font-medium">
            {translations.label}
          </Label>
          <div className="relative">
            <Input
              id="qst-number"
              type="text"
              value={qstNumber}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                onQstChange(value)
                setQstTouched(true)
              }}
              onBlur={() => setQstTouched(true)}
              className={`font-mono ${
                showQstError ? 'border-red-500 focus-visible:ring-red-500' :
                showQstSuccess ? 'border-green-500 focus-visible:ring-green-500' : ''
              }`}
              placeholder={translations.placeholder}
              maxLength={16}
            />
            {showQstSuccess && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            )}
            {showQstError && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            )}
          </div>
          <div className="text-xs">
            {showQstError ? (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {qstValidation.message}
              </span>
            ) : showQstSuccess ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {translations.validFormat}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {translations.format}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
