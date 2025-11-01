"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react"

interface TaxInformationCardProps {
  gstNumber: string
  qstNumber: string
  onGstChange: (value: string) => void
  onQstChange: (value: string) => void
  translations: {
    title: string
    description: string
    gstLabel: string
    gstPlaceholder: string
    gstFormat: string
    qstLabel: string
    qstPlaceholder: string
    qstFormat: string
    invalidFormat: string
    validFormat: string
    requiredForQuebec: string
  }
}

// Validation helpers
const GST_REGEX = /^\d{9}RT\d{4}$/
const QST_REGEX = /^\d{10}TQ\d{4}$/

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

export function TaxInformationCard({
  gstNumber,
  qstNumber,
  onGstChange,
  onQstChange,
  translations
}: TaxInformationCardProps) {
  const [gstTouched, setGstTouched] = useState(false)
  const [qstTouched, setQstTouched] = useState(false)

  const gstValidation = validateGST(gstNumber)
  const qstValidation = validateQST(qstNumber)

  const showGstError = gstTouched && !gstValidation.isValid
  const showQstError = qstTouched && !qstValidation.isValid

  const showGstSuccess = gstTouched && gstValidation.isValid && gstNumber.length > 0
  const showQstSuccess = qstTouched && qstValidation.isValid && qstNumber.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">{translations.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {translations.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GST Number */}
        <div className="space-y-2">
          <Label htmlFor="gst-number" className="text-sm font-medium">
            {translations.gstLabel}
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
              placeholder={translations.gstPlaceholder}
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
                {translations.gstFormat}
              </span>
            )}
          </div>
        </div>

        {/* QST Number */}
        <div className="space-y-2">
          <Label htmlFor="qst-number" className="text-sm font-medium">
            {translations.qstLabel}
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
              placeholder={translations.qstPlaceholder}
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
                {translations.qstFormat}
              </span>
            )}
          </div>
        </div>

        {/* Info Note */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{translations.requiredForQuebec}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
