// Service d'accès à l'API Finnhub (actions).
// Une clé API gratuite est requise : voir README (variable VITE_FINNHUB_API_KEY).
const BASE_URL = 'https://finnhub.io/api/v1'
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY

export function hasFinnhubKey() {
  return Boolean(API_KEY && API_KEY.trim() && API_KEY !== 'votre_cle_finnhub_ici')
}

async function request(path, params = {}) {
  if (!hasFinnhubKey()) {
    throw new Error(
      "Clé Finnhub manquante. Renseignez VITE_FINNHUB_API_KEY dans le fichier .env",
    )
  }

  const url = new URL(BASE_URL + path)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value)
  })
  url.searchParams.set('token', API_KEY)

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Finnhub a répondu ${res.status} (${res.statusText})`)
  }
  return res.json()
}

/**
 * Récupère la cotation temps réel d'une action.
 * Réponse Finnhub /quote :
 *   c = prix courant, d = variation, dp = variation %, h/l/o = high/low/open, pc = clôture précédente
 */
export async function fetchStockQuote(symbol) {
  const q = await request('/quote', { symbol })
  return {
    symbol,
    price: q.c,
    change: q.d,
    changePercent: q.dp,
    high: q.h,
    low: q.l,
    open: q.o,
    previousClose: q.pc,
  }
}

/**
 * Récupère l'historique OHLC (bougies) d'une action.
 * @returns {{time:number, price:number}[]}  (price = clôture, time en ms)
 */
export async function fetchStockCandles(symbol, resolution, fromSeconds, toSeconds) {
  const data = await request('/stock/candle', {
    symbol,
    resolution,
    from: fromSeconds,
    to: toSeconds,
  })
  if (!data || data.s !== 'ok' || !Array.isArray(data.c)) {
    // 's' peut valoir 'no_data' ou le plan gratuit peut restreindre l'accès.
    return []
  }
  return data.c.map((close, i) => ({ time: data.t[i] * 1000, price: close }))
}
