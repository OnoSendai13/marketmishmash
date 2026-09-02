// Service d'accès au micro-backend d'analyse (FastAPI).
// En développement, Vite proxifie « /api » vers http://localhost:8000
// (voir vite.config.js). Le backend doit donc être lancé en parallèle.

const BASE = '/api/analysis'

async function getJson(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body && body.detail) detail = body.detail
    } catch {
      /* corps non-JSON : on garde le statut */
    }
    throw new Error(detail)
  }
  return res.json()
}

/** Analyse technique : OHLCV + indicateurs (RSI, MACD, Bollinger, EMA, ATR). */
export function fetchTechnical(ticker, period = '6mo', interval = '1d') {
  const q = new URLSearchParams({ period, interval })
  return getJson(`${BASE}/technical/${encodeURIComponent(ticker)}?${q}`)
}

/** Fondamentaux (actions US uniquement). */
export function fetchFundamentals(ticker) {
  return getJson(`${BASE}/fundamentals/${encodeURIComponent(ticker)}`)
}

/** News + score de sentiment VADER (actions US uniquement). */
export function fetchNews(ticker) {
  return getJson(`${BASE}/news/${encodeURIComponent(ticker)}`)
}

/** Backtest d'une stratégie (sma_cross | rsi_reversal). */
export function runBacktest(ticker, body) {
  return getJson(`${BASE}/backtest/${encodeURIComponent(ticker)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
