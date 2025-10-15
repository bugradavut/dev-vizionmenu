/**
 * Theme Registry
 * Central registry for all available theme layouts
 * Uses dynamic imports for code splitting and lazy loading
 */

'use client'

import dynamic from 'next/dynamic'
import type { ThemeLayout, ThemeLayoutProps } from './theme.types'

// Lazy load theme components (only loaded when used)
const DefaultLayout = dynamic(() => import('./default/default-layout'), {
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
})

const Template1Layout = dynamic(() => import('./template-1/template-1-layout'), {
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
})

/**
 * Theme registry mapping
 */
const THEME_REGISTRY = {
  'default': DefaultLayout,
  'template-1': Template1Layout
} as const

/**
 * Get theme component by layout ID
 * Falls back to default if theme not found
 */
export function getThemeLayout(themeLayout?: ThemeLayout | null): React.ComponentType<ThemeLayoutProps> {
  if (!themeLayout || !THEME_REGISTRY[themeLayout]) {
    return THEME_REGISTRY['default']
  }
  return THEME_REGISTRY[themeLayout]
}

/**
 * Check if theme layout exists
 */
export function isValidTheme(themeLayout: string): themeLayout is ThemeLayout {
  return themeLayout in THEME_REGISTRY
}

/**
 * Get all available themes (for admin UI)
 */
export function getAvailableThemes(): Array<{ id: ThemeLayout; name: string; description: string }> {
  return [
    {
      id: 'default',
      name: 'Default',
      description: 'Clean and minimalist design with side categories'
    },
    {
      id: 'template-1',
      name: 'Template 1',
      description: 'Restaurant-style with hero banner and horizontal category bar'
    }
  ]
}
