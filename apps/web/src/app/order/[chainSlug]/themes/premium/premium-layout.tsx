/**
 * Premium Theme Layout - PLACEHOLDER
 * TODO: Implement premium dark theme with gold accents
 * For now, uses default layout
 */

'use client'

import DefaultLayout from '../default/default-layout'
import type { ThemeLayoutProps } from '../theme.types'

export default function PremiumLayout(props: ThemeLayoutProps) {
  // TODO: Implement premium theme
  // For now, fallback to default
  return <DefaultLayout {...props} />
}
