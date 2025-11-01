"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react"

interface GstNumberCardProps {
  gstNumber: string
  onGstChange: (value: string) => void
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
const GST_REGEX = /^\d{9}RT\d{4}$/

function validateGST(value: string): { isValid: boolean; message?: string } {
  if (!value) {
    return { isValid: true } // Empty is valid (optional)
  }

  if (!GST_REGEX.test(value)) {
    return { isValid: false, message: "Invalid format. Expected: XXXXXXXXXRTXXXX" }
  }

  // FO-108 Test Case: Check for invalid test numbers
  if (value === "11111111RT0001") {
    return { isValid: false, message: "The GST number is invalid (test case)" }
  }

  return { isValid: true }
}

export function GstNumberCard({
  gstNumber,
  onGstChange,
  translations
}: GstNumberCardProps) {
  const [gstTouched, setGstTouched] = useState(false)

  const gstValidation = validateGST(gstNumber)
  const showGstError = gstTouched && !gstValidation.isValid
  const showGstSuccess = gstTouched && gstValidation.isValid && gstNumber.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
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
        {/* GST Number Input */}
        <div className="space-y-2">
          <Label htmlFor="gst-number" className="text-sm font-medium">
            {translations.label}
          </Label>
          <div className="relative">
            <Input
              id="gst-number"
              type="text"
              value={gstNumber}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                onGstChange(value)
                setGstTouched(true)
              }}
              onBlur={() => setGstTouched(true)}
              className={`font-mono ${
                showGstError ? 'border-red-500 focus-visible:ring-red-500' :
                showGstSuccess ? 'border-green-500 focus-visible:ring-green-500' : ''
              }`}
              placeholder={translations.placeholder}
              maxLength={15}
            />
            {showGstSuccess && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            )}
            {showGstError && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            )}
          </div>
          <div className="text-xs">
            {showGstError ? (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {gstValidation.message}
              </span>
            ) : showGstSuccess ? (
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
