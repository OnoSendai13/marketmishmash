// Service d'accès à l'API CoinGecko (crypto).
// Aucune clé API n'est requise pour les endpoints publics utilisés ici.
const BASE_URL = 'https://api.coingecko.com/api/v3'

async function request(path, params = {}) {
  const url = new URL(BASE_URL + path)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value)
  })

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`CoinGecko a répondu ${res.status} (${res.statusText})`)
  }
  return res.json()
}

/**
 * Récupère les données de marché (prix, variation, volume) pour une liste d'ID.
 * @param {string[]} ids   - identifiants CoinGecko (ex: ["bitcoin", "ethereum"])
 * @param {string}   currency - devise (ex: "usd")
 */
export async function fetchCryptoMarkets(ids, currency = 'usd') {
  if (!ids || ids.length === 0) return []
  return request('/coins/markets', {
    vs_currency: currency,
    ids: ids.join(','),
    order: 'market_cap_desc',
    per_page: ids.length,
    page: 1,
    sparkline: false,
    price_change_percentage: '24h',
  })
}

/**
 * Récupère l'historique de prix d'une crypto pour un nombre de jours donné.
 * @returns {{time:number, price:number}[]}
 */
export async function fetchCryptoChart(id, currency = 'usd', days = 1) {
  const data = await request(`/coins/${id}/market_chart`, {
    vs_currency: currency,
    days,
  })
  // data.prices = [[timestampMs, price], ...]
  return (data.prices || []).map(([time, price]) => ({ time, price }))
}
