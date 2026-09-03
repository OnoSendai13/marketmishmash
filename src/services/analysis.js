// Service d'accès au micro-backend d'analyse (FastAPI).
// En développement, Vite proxifie « /api » vers http://localhost:9100
// (voir vite.config.js). Le backend doit donc être lancé en parallèle.

import { getApiKey } from './apiStore.js'

const BASE = '/api/analysis'

/**
 * Retourne les headers HTTP pour Alpha Vantage.
 * Si la clé est configurée dans l'interface (localStorage), elle est envoyée
 * via le header 'X-Alpha-Vantage-Key' qui a la priorité sur backend/.env.
 */
function getAlphaVantageHeaders() {
  const key = getApiKey('alphavantage')
  return key ? { 'X-Alpha-Vantage-Key': key } : {}
}

async function getJson(url, options = {}) {
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

/** Fair Value Gaps (zones FVG — Smart Money Concepts). */
export function fetchFVG(ticker, period = '3mo', interval = '1d') {
  const q = new URLSearchParams({ period, interval })
  return getJson(`${BASE}/fvg/${encodeURIComponent(ticker)}?${q}`)
}

/** News + sentiment via Alpha Vantage (NEWS_SENTIMENT, cache 15 min côté backend). */
export function fetchNewsAV(ticker) {
  return getJson(`${BASE}/news_av/${encodeURIComponent(ticker)}`, {
    headers: getAlphaVantageHeaders(),
  })
}

/** News marché global (multi-topics Alpha Vantage, fallback finviz). */
export function fetchGlobalNews(topics, limit = 50) {
  const params = { limit: String(limit) }
  if (topics) params.topics = topics
  const q = new URLSearchParams(params)
  return getJson(`/api/news/global?${q}`, {
    headers: getAlphaVantageHeaders(),
  })
}

/** Liste des topics disponibles pour le filtrage. */
export function fetchNewsTopics() {
  return getJson('/api/news/topics')
}

/** Backtest d'une stratégie (sma_cross | rsi_reversal). */
export function runBacktest(ticker, body) {
  return getJson(`${BASE}/backtest/${encodeURIComponent(ticker)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
