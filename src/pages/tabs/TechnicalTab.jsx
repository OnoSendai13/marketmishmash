import { useEffect, useState } from 'react'
import { fetchTechnical, fetchFVG } from '../../services/analysis'
import { formatPrice } from '../../utils/format'
import CandlestickChart from '../../components/CandlestickChart'

const PERIODS = [
  { key: '3mo', label: '3 mois' },
  { key: '6mo', label: '6 mois' },
  { key: '1y', label: '1 an' },
  { key: '2y', label: '2 ans' },
]

function fmt(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Petit encart d'une métrique du résumé. */
function StatCell({ label, value, tone }) {
  const color =
    tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-gray-100'
  return (
    <div className="rounded-lg border border-white/5 bg-panel2 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={'text-sm font-semibold ' + color}>{value}</div>
    </div>
  )
}

export default function TechnicalTab({ ticker }) {
  const [period, setPeriod] = useState('6mo')
  const [payload, setPayload] = useState(null)
  const [fvgs, setFvgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // Analyse technique + FVG chargées en parallèle.
    Promise.all([
      fetchTechnical(ticker, period, '1d'),
      fetchFVG(ticker, period, '1d').catch(() => ({ fvgs: [] })),
    ])
      .then(([tech, fvg]) => {
        if (cancelled) return
        setPayload(tech)
        setFvgs(fvg?.fvgs || [])
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Erreur de chargement')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticker, period])

  const summary = payload?.summary
  const fvgOpen = fvgs.filter((f) => !f.filled).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Période :</span>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={
              'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
              (period === p.key
                ? 'bg-accent text-white'
                : 'bg-panel2 text-gray-300 hover:bg-white/10')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement de l'analyse technique…</p>}
      {error && (
        <div className="rounded-lg border border-down/30 bg-down/10 p-4 text-sm text-down">
          {error}
          <div className="mt-1 text-xs text-gray-400">
            Le backend d'analyse est-il démarré ? (cd backend &amp;&amp; ./start.sh)
          </div>
        </div>
      )}

      {!loading && !error && payload && (
        <>
          {/* Résumé des indicateurs */}
          {summary && (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <StatCell label="Clôture" value={formatPrice(summary.close, 'usd')} />
              <StatCell
                label="RSI (14)"
                value={fmt(summary.rsi_14)}
                tone={summary.rsi_14 >= 70 ? 'down' : summary.rsi_14 <= 30 ? 'up' : undefined}
              />
              <StatCell
                label="Signal MACD"
                value={summary.macd_trend === 'haussier' ? 'Haussier ▲' : summary.macd_trend === 'baissier' ? 'Baissier ▼' : 'Neutre'}
                tone={summary.macd_trend === 'haussier' ? 'up' : summary.macd_trend === 'baissier' ? 'down' : undefined}
              />
              <StatCell label="ATR (14)" value={fmt(summary.atr_14)} />
              <StatCell label="EMA 20" value={fmt(summary.ema_20)} />
              <StatCell label="EMA 50" value={fmt(summary.ema_50)} />
              <StatCell label="EMA 200" value={fmt(summary.ema_200)} />
              <StatCell
                label="FVG non remplis"
                value={String(fvgOpen)}
                tone={fvgOpen > 0 ? 'up' : undefined}
              />
            </div>
          )}

          {/* Graphique pro (chandeliers TradingView) + EMA + Bollinger + FVG + RSI + MACD */}
          <div className="rounded-xl border border-white/5 bg-panel p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">
              Chandeliers &amp; indicateurs — EMA 20/50/200, Bandes de Bollinger, zones FVG
            </h3>
            <CandlestickChart rows={payload.data} fvgs={fvgs} />
          </div>
        </>
      )}
    </div>
  )
}
