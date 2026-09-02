// Service d'accès à l'API Finnhub (actions).
// La clé API est lue en priorité depuis la configuration in-app (localStorage,
// via apiStore), avec repli sur la variable d'environnement VITE_FINNHUB_API_KEY.
import { getApiKey } from './apiStore'

const BASE_URL = 'https://finnhub.io/api/v1'
const ENV_KEY = import.meta.env.VITE_FINNHUB_API_KEY

// Résout la clé courante à chaque appel (localStorage prioritaire, puis .env).
function resolveKey() {
  const envFallback =
    ENV_KEY && ENV_KEY !== 'votre_cle_finnhub_ici' ? ENV_KEY : ''
  return getApiKey('finnhub', envFallback)
}

export function hasFinnhubKey() {
  return Boolean(resolveKey())
}

async function request(path, params = {}) {
  const apiKey = resolveKey()
  if (!apiKey) {
    throw new Error(
      "Clé Finnhub manquante. Configurez-la via « 🔑 Configurer les APIs » (ou dans le fichier .env).",
    )
  }

  const url = new URL(BASE_URL + path)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value)
  })
  url.searchParams.set('token', apiKey)

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
 * @deprecated L'endpoint /stock/candle de Finnhub est réservé aux plans payants
 * (renvoie 403 en gratuit). L'historique des actions passe désormais par
 * Yahoo Finance : voir src/services/yahoo.js -> fetchStockChartYahoo().
 * Conservé uniquement pour référence.
 *
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
