// Service d'accès à l'API publique de charting de Yahoo Finance.
//
// Yahoo Finance sert l'historique des cours via l'endpoint /v8/finance/chart.
// C'est gratuit, sans clé, avec une large couverture (actions, ETF, indices…).
//
// ⚠️ CORS : Yahoo n'ajoute pas d'en-tête CORS, le navigateur bloque donc les
// appels directs. On passe par le proxy Vite (voir vite.config.js) qui redirige
// le chemin local « /yahoo » vers https://query1.finance.yahoo.com.
// -> Fonctionne en développement (`npm run dev`) et en `npm run preview`.
//    Pour un build statique déployé sur un hébergeur sans proxy, il faudrait
//    un petit serveur relais (voir README).

// Base relative : interceptée par le proxy Vite.
const BASE = '/yahoo/v8/finance/chart'

/**
 * Récupère l'historique des cours d'une action via Yahoo Finance.
 * @param {string} symbol   symbole boursier (ex: "AAPL", "MC.PA")
 * @param {string} range    plage Yahoo (ex: "1d", "5d", "1mo", "3mo", "1y")
 * @param {string} interval intervalle Yahoo (ex: "5m", "15m", "60m", "1d")
 * @returns {Promise<{time:number, price:number}[]>}  time en ms, price = clôture
 */
export async function fetchStockChartYahoo(symbol, range, interval) {
  const url = `${BASE}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Yahoo Finance a répondu ${res.status} (${res.statusText})`)
  }

  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result || !Array.isArray(result.timestamp)) {
    return []
  }

  const timestamps = result.timestamp
  const closes = result.indicators?.quote?.[0]?.close || []

  // On associe chaque timestamp à sa clôture, en ignorant les points nuls
  // (Yahoo renvoie parfois des `null` sur des séances incomplètes).
  const points = []
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]
    if (close === null || close === undefined) continue
    points.push({ time: timestamps[i] * 1000, price: close })
  }
  return points
}
