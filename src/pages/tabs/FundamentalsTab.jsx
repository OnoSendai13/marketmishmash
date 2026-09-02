import { useEffect, useState } from 'react'
import { fetchFundamentals, fetchNews } from '../../services/analysis'

/** Badge coloré selon le libellé de sentiment (haussier/neutre/baissier). */
function SentimentBadge({ label, score }) {
  const map = {
    haussier: 'bg-up/15 text-up border-up/30',
    baissier: 'bg-down/15 text-down border-down/30',
    neutre: 'bg-white/5 text-gray-300 border-white/10',
  }
  const cls = map[label] || map.neutre
  return (
    <span className={'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ' + cls}>
      {label === 'haussier' ? '▲' : label === 'baissier' ? '▼' : '■'} {label}
      {score !== undefined && <span className="opacity-70">({score})</span>}
    </span>
  )
}

const METRIC_LABELS = {
  per: 'P/E',
  forward_per: 'P/E prév.',
  pb: 'P/B',
  eps: 'BPA (EPS)',
  market_cap: 'Capitalisation',
  dividend_yield: 'Rendement div.',
  debt_equity: 'Dette / Capitaux',
  roe: 'ROE',
  roi: 'ROI',
  gross_margin: 'Marge brute',
  beta: 'Bêta',
  high_52w: 'Haut 52 sem.',
  low_52w: 'Bas 52 sem.',
  short_float: 'Short float',
  insider_own: 'Détention interne',
  price: 'Prix',
}

const METRIC_ORDER = [
  'price', 'per', 'forward_per', 'pb', 'eps', 'market_cap',
  'roe', 'roi', 'gross_margin', 'debt_equity', 'beta', 'dividend_yield',
  'high_52w', 'low_52w', 'short_float', 'insider_own',
]

export default function FundamentalsTab({ ticker, isCrypto, symbol }) {
  const [fund, setFund] = useState(null)
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isCrypto) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.allSettled([fetchFundamentals(ticker), fetchNews(ticker)])
      .then(([f, n]) => {
        if (cancelled) return
        if (f.status === 'fulfilled') setFund(f.value)
        if (n.status === 'fulfilled') setNews(n.value)
        if (f.status === 'rejected' && n.status === 'rejected') {
          setError(f.reason?.message || 'Données fondamentales indisponibles.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticker, isCrypto])

  if (isCrypto) {
    return (
      <div className="rounded-lg border border-white/10 bg-panel2 p-5 text-sm text-gray-300">
        <p className="mb-1 font-semibold text-gray-100">Fondamentaux non disponibles pour les cryptomonnaies</p>
        <p className="text-gray-400">
          Les ratios financiers et les news via finvizfinance concernent uniquement les actions
          américaines. Pour {symbol}, consultez l'onglet « Analyse Technique » et « Backtest ».
        </p>
      </div>
    )
  }

  if (loading) return <p className="text-sm text-gray-500">Chargement des fondamentaux &amp; news…</p>

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-down/30 bg-down/10 p-4 text-sm text-down">
          {error}
          <div className="mt-1 text-xs text-gray-400">
            Le backend est-il démarré ? Les fondamentaux ne couvrent que les actions US.
          </div>
        </div>
      )}

      {/* Métriques fondamentales */}
      {fund && (
        <div className="mb-6 rounded-xl border border-white/5 bg-panel p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-200">
              {fund.company}
              <span className="ml-2 text-xs font-normal text-gray-500">
                {fund.sector} · {fund.industry}
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {METRIC_ORDER.filter((k) => fund.metrics[k] !== undefined).map((k) => (
              <div key={k} className="rounded-lg border border-white/5 bg-panel2 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  {METRIC_LABELS[k] || k}
                </div>
                <div className="text-sm font-semibold text-gray-100">{fund.metrics[k] || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News + sentiment */}
      {news && (
        <div className="rounded-xl border border-white/5 bg-panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-200">Dernières actualités &amp; sentiment</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              Sentiment global : <SentimentBadge label={news.label} score={news.average_score} />
            </div>
          </div>
          {news.items.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune actualité récente.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {news.items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-200 hover:text-accent hover:underline"
                    >
                      {item.title}
                    </a>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {item.source} · {item.date}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <SentimentBadge label={item.sentiment_label} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
