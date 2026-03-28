import type { Money } from './types'

export function createEmptyMoney(currency = 'USD'): Money {
  return {
    raw: '0.00',
    formatted: formatMoney(0, currency),
    currency,
    symbol: getCurrencySymbol(currency),
  }
}

export function getCurrencySymbol(currency = 'USD') {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
    }).formatToParts(0)

    return parts.find((part) => part.type === 'currency')?.value || '$'
  } catch {
    return '$'
  }
}

export function formatMoney(value: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

export function moneyFromRaw(rawValue: number | string, currency = 'USD'): Money {
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
  const safeValue = Number.isFinite(value) ? value : 0

  return {
    raw: safeValue.toFixed(2),
    formatted: formatMoney(safeValue, currency),
    currency,
    symbol: getCurrencySymbol(currency),
  }
}

export function getMoneyRawValue(money: Pick<Money, 'raw'> | null | undefined) {
  const raw = typeof money?.raw === 'string' ? Number(money.raw) : 0
  return Number.isFinite(raw) ? raw : 0
}

export function getMoneyFormattedValue(money: Pick<Money, 'formatted'> | null | undefined) {
  return typeof money?.formatted === 'string' && money.formatted.trim() ? money.formatted : '$0.00'
}

export function getSafeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

export function getNonEmptyText(value: unknown, fallback: string) {
  const safe = getSafeText(value)
  return safe || fallback
}

export function decodeHtmlEntities(value: string) {
  if (!value || typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return value
  }

  let decoded = value

  for (let index = 0; index < 3; index += 1) {
    const parser = new window.DOMParser()
    const document = parser.parseFromString(decoded, 'text/html')
    const next = document.documentElement.textContent || decoded

    if (next === decoded) {
      break
    }

    decoded = next
  }

  return decoded
}
