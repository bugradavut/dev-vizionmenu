// Small helpers to present audit log changes in a human-friendly way

export type Language = 'en' | 'fr'

// Field labels and optional formatters per dot-path
const FIELD_LABELS: Record<string, { en: string; fr: string; fmt?: 'currency' | 'minutes' | 'bool' | 'string' | 'list' }> = {
  // Branch settings
  'orderFlow': { en: 'Order Flow', fr: 'Flux de Commande' },
  'deliveryFee': { en: 'Delivery Fee', fr: 'Frais de Livraison', fmt: 'currency' },
  'minimumOrderAmount': { en: 'Minimum Order Amount', fr: 'Montant Minimum de Commande', fmt: 'currency' },
  'freeDeliveryThreshold': { en: 'Free Delivery Threshold', fr: 'Seuil de Livraison Gratuite', fmt: 'currency' },
  'timingSettings.baseDelay': { en: 'Base Delay', fr: 'Délai de Base', fmt: 'minutes' },
  'timingSettings.deliveryDelay': { en: 'Delivery Delay', fr: 'Délai de Livraison', fmt: 'minutes' },
  'timingSettings.autoReady': { en: 'Auto Ready', fr: 'Prêt Automatique', fmt: 'bool' },

  // Menu item
  'name': { en: 'Name', fr: 'Nom' },
  'price': { en: 'Price', fr: 'Prix', fmt: 'currency' },
  'is_available': { en: 'Available', fr: 'Disponible', fmt: 'bool' },
  'allergens': { en: 'Allergens', fr: 'Allergènes', fmt: 'list' },
  'dietary_info': { en: 'Dietary Info', fr: 'Informations Diététiques', fmt: 'list' },

  // Users
  'is_active': { en: 'Active', fr: 'Actif', fmt: 'bool' },
  'role': { en: 'Role', fr: 'Rôle' },
}

export function labelFor(path: string, language: Language): string {
  const exact = FIELD_LABELS[path]
  if (exact) return exact[language]
  // Fallback: last segment, start-case
  const last = path.split('.').pop() || path
  const pretty = last.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase())
  return pretty
}

export function formatValue(path: string, value: unknown, language: Language): string {
  if (value === undefined || value === null) return '-'
  const config = FIELD_LABELS[path]
  const fmt = config?.fmt
  if (fmt === 'bool') {
    const yes = language === 'fr' ? 'Oui' : 'Yes'
    const no = language === 'fr' ? 'Non' : 'No'
    return value ? yes : no
  }
  if (fmt === 'currency') {
    const num = Number(value)
    if (!isFinite(num)) return String(value)
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(num)
  }
  if (fmt === 'minutes') {
    const num = Number(value)
    if (!isFinite(num)) return String(value)
    return `${num} ${language === 'fr' ? 'min' : 'min'}`
  }
  if (fmt === 'list') {
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }
  // Generic formatting
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export type FlatEntry = { path: string; value: unknown }

// Normalize menu item data structure for consistent comparison
function normalizeMenuItemData(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj

  const normalized = { ...obj as Record<string, unknown> }

  // Convert nested category object to flat category_id
  if (normalized.category && typeof normalized.category === 'object') {
    const category = normalized.category as Record<string, unknown>
    normalized.category_id = category.id
    delete normalized.category
  }

  return normalized
}

export function flattenObject(obj: unknown, prefix = ''): FlatEntry[] {
  if (obj === null || obj === undefined) return []
  if (typeof obj !== 'object') return [{ path: prefix || '', value: obj }]

  // Normalize data structure first
  const normalized = normalizeMenuItemData(obj)

  const out: FlatEntry[] = []
  for (const [k, v] of Object.entries(normalized as Record<string, unknown>)) {
    const nextPrefix = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenObject(v, nextPrefix))
    } else {
      out.push({ path: nextPrefix, value: v })
    }
  }
  return out
}

export type ChangeRow = { field: string; from?: unknown; to?: unknown }

// Build table rows from a log.changes payload
export function buildChangeRows(changes: unknown): ChangeRow[] {
  if (!changes || typeof changes !== 'object') return []

  const changesObj = changes as Record<string, unknown>

  // 1) before/after
  if (changesObj.before !== undefined && changesObj.after) {
    const beforeFlat = new Map(flattenObject(changesObj.before || {}).map(e => [e.path, e.value]))
    const afterFlat = new Map(flattenObject(changesObj.after).map(e => [e.path, e.value]))
    const paths = new Set([...beforeFlat.keys(), ...afterFlat.keys()])

    // Show all fields (excluding auto-updated fields)
    const autoUpdatedFields = ['updated_at', 'created_at']

    return Array.from(paths)
      .filter(path => {
        // Skip auto-updated fields only
        return !autoUpdatedFields.some(field => path.includes(field))
      })
      .map(path => ({ field: path, from: beforeFlat.get(path), to: afterFlat.get(path) }))
  }

  // 2) update only
  if (changesObj.update && typeof changesObj.update === 'object') {
    return flattenObject(changesObj.update).map(e => ({ field: e.path, to: e.value }))
  }

  // 3) created (after only)
  if (changesObj.after && typeof changesObj.after === 'object') {
    return flattenObject(changesObj.after).map(e => ({ field: e.path, to: e.value }))
  }

  // 4) deleted flag
  if (changesObj.deleted) {
    return [{ field: 'deleted', from: true, to: false }]
  }

  // 5) raw object fallback (e.g., branch settings update payload)
  return flattenObject(changes).map(e => ({ field: e.path, to: e.value }))
}

