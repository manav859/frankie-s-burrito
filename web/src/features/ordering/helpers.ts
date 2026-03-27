import type { Money } from './types'

export function createEmptyMoney(currency = 'USD'): Money {
  return {
    raw: '0.00',
    formatted: '$0.00',
    currency,
    symbol: '$',
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
