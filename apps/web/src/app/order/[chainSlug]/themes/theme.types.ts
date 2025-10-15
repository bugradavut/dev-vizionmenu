/**
 * Theme System Type Definitions
 * Defines theme configuration and layout types
 */

import type { Chain, Branch } from '@/services/customer-chains.service'
import type { CustomerMenu } from '@/services/customer-menu.service'

/**
 * Available theme layouts
 */
export type ThemeLayout = 'default' | 'template-1'

/**
 * Theme color configuration
 */
export interface ThemeColors {
  primary: string
  secondary?: string
  accent?: string
  background?: string
  card?: string
  text?: string
}

/**
 * Complete theme configuration stored in database
 */
export interface ThemeConfig {
  layout: ThemeLayout
  colors?: ThemeColors
  customizations?: Record<string, unknown>
}

/**
 * Order context passed to theme layouts
 */
export interface OrderContext {
  chainSlug: string
  branchId?: string
  tableNumber?: number
  zone?: string
  source: 'qr' | 'web'
  isQROrder: boolean
}

/**
 * Props passed to all theme layout components
 */
export interface ThemeLayoutProps {
  chain: Chain
  branch: Branch
  customerMenu: CustomerMenu
  orderContext: OrderContext
  availableBranches?: Branch[]
  onBranchChange?: (branch: Branch) => void
}

/**
 * Theme registry entry
 */
export interface ThemeRegistryEntry {
  id: ThemeLayout
  name: string
  description: string
  component: React.ComponentType<ThemeLayoutProps>
}
