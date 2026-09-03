// Service d'accès à l'API CoinGecko (crypto).
// Aucune clé n'est requise pour les endpoints publics. Une clé « Demo » peut
// toutefois être configurée pour augmenter le quota :
//   - en priorité via l'interface (localStorage, id « coingecko »),
//   - à défaut via la variable d'environnement VITE_COINGECKO_API_KEY (.env racine).
// Elle est alors envoyée dans l'en-tête x-cg-demo-api-key.
import { getApiKey } from './apiStore'

const BASE_URL = 'https://api.coingecko.com/api/v3'

// Repli .env (ignoré s'il vaut le placeholder du .env.example).
const ENV_KEY = import.meta.env.VITE_COINGECKO_API_KEY
const ENV_FALLBACK =
  ENV_KEY && ENV_KEY !== 'votre_cle_coingecko_ici' ? ENV_KEY : ''

async function request(path, params = {}) {
  const url = new URL(BASE_URL + path)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value)
  })

  const headers = { Accept: 'application/json' }
  // Clé optionnelle : interface (localStorage) prioritaire, puis repli .env.
  const apiKey = getApiKey('coingecko', ENV_FALLBACK)
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey

  const res = await fetch(url.toString(), { headers })

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
