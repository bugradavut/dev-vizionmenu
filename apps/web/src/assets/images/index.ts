// Order Source Icons Export
// Bu dosya tüm order source ikonlarını tek yerden export eder

// Order source icons
import qrCodeIcon from './order-sources/qr-code.webp'
import uberEatsIcon from './order-sources/uber-eats.webp'
import phoneIcon from './order-sources/phone.webp'
import webIcon from './order-sources/web.webp'
import doordashIcon from './order-sources/doordash.webp'

export const orderSourceIcons = {
  qr_code: qrCodeIcon,
  uber_eats: uberEatsIcon,
  phone: phoneIcon,
  web: webIcon,
  doordash: doordashIcon,
} as const

// Type for order source keys
export type OrderSourceKey = keyof typeof orderSourceIcons

// Helper function to get source icon
export const getSourceIcon = (source: string) => {
  return orderSourceIcons[source as OrderSourceKey] || orderSourceIcons.web
}