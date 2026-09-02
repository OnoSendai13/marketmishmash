// Fonctions utilitaires de formatage (prix, pourcentages, volumes, dates).

const CURRENCY_SYMBOLS = { usd: '$', eur: '€', gbp: '£' }

export function formatPrice(value, currency = 'usd') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const symbol = CURRENCY_SYMBOLS[currency] || ''
  const digits = value >= 1 ? 2 : 6
  const formatted = Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${symbol}${formatted}`
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(2)} %`
}

export function formatVolume(value, currency = 'usd') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const symbol = CURRENCY_SYMBOLS[currency] || ''
  const abs = Math.abs(value)
  let out
  if (abs >= 1e12) out = `${(value / 1e12).toFixed(2)} B` // billion (milliard) -> ici trillion FR
  else if (abs >= 1e9) out = `${(value / 1e9).toFixed(2)} Md`
  else if (abs >= 1e6) out = `${(value / 1e6).toFixed(2)} M`
  else if (abs >= 1e3) out = `${(value / 1e3).toFixed(2)} k`
  else out = value.toFixed(2)
  return `${symbol}${out}`
}

export function formatTime(date) {
  if (!date) return '—'
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
