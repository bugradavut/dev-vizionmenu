"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { useLanguage } from "@/contexts/language-context"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class MapErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Map Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <MapErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      )
    }

    return this.props.children
  }
}

function MapErrorFallback({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  const { language } = useLanguage()

  return (
    <div className="w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <div className="text-red-600 text-lg font-medium mb-2">
          {language === 'fr' ? 'Erreur de carte' : 'Map Error'}
        </div>
        <p className="text-red-600 text-sm">
          {language === 'fr'
            ? 'La carte n\'a pas pu se charger correctement.'
            : 'The map could not load properly.'
          }
        </p>
        {error && (
          <details className="mt-2 text-xs text-red-500">
            <summary className="cursor-pointer">
              {language === 'fr' ? 'Détails de l\'erreur' : 'Error details'}
            </summary>
            <pre className="mt-1 text-left bg-red-100 p-2 rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
      <div className="space-x-2">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
        >
          {language === 'fr' ? 'Réessayer' : 'Retry'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
        >
          {language === 'fr' ? 'Recharger la page' : 'Reload page'}
        </button>
      </div>
    </div>
  )
}

export { MapErrorBoundaryClass as MapErrorBoundary }