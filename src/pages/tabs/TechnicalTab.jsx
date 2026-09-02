import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts'
import { fetchTechnical } from '../../services/analysis'
import { formatPrice } from '../../utils/format'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchTechnical(ticker, period, '1d')
      .then((d) => {
        if (!cancelled) setPayload(d)
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

  const chartData = useMemo(() => {
    if (!payload?.data) return []
    return payload.data.map((r) => ({
      date: r.date.slice(0, 10),
      close: r.close,
      ema20: r.ema_20,
      ema50: r.ema_50,
      ema200: r.ema_200,
      bbUpper: r.bb_upper,
      bbLower: r.bb_lower,
      rsi: r.rsi_14,
      macd: r.macd,
      signal: r.macd_signal,
      hist: r.macd_hist,
    }))
  }, [payload])

  const summary = payload?.summary

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
                label="Bandes Bollinger"
                value={`${fmt(summary.bb_lower, 0)} – ${fmt(summary.bb_upper, 0)}`}
              />
            </div>
          )}

          {/* Graphique de cours + EMA + Bollinger */}
          <div className="mb-6 rounded-xl border border-white/5 bg-panel p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              Cours &amp; moyennes mobiles (EMA 20/50/200) + Bandes de Bollinger
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={40} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  width={55}
                  tickFormatter={(v) => fmt(v, 0)}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #ffffff20', fontSize: 12 }}
                  formatter={(v, name) => [fmt(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="bbUpper" stroke="#6366f130" fill="#6366f110" name="BB sup." dot={false} />
                <Area type="monotone" dataKey="bbLower" stroke="#6366f130" fill="#0000" name="BB inf." dot={false} />
                <Line type="monotone" dataKey="close" stroke="#e5e7eb" strokeWidth={2} dot={false} name="Cours" />
                <Line type="monotone" dataKey="ema20" stroke="#22d3ee" strokeWidth={1} dot={false} name="EMA 20" />
                <Line type="monotone" dataKey="ema50" stroke="#f59e0b" strokeWidth={1} dot={false} name="EMA 50" />
                <Line type="monotone" dataKey="ema200" stroke="#ef4444" strokeWidth={1} dot={false} name="EMA 200" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* RSI */}
            <div className="rounded-xl border border-white/5 bg-panel p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-300">RSI (14) — zones 30 / 70</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} minTickGap={50} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #ffffff20', fontSize: 12 }}
                    formatter={(v) => [fmt(v), 'RSI']}
                  />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" />
                  <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="rsi" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* MACD */}
            <div className="rounded-xl border border-white/5 bg-panel p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-300">MACD (12, 26, 9)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} minTickGap={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={40} tickFormatter={(v) => fmt(v, 1)} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #ffffff20', fontSize: 12 }}
                    formatter={(v, name) => [fmt(v), name]}
                  />
                  <ReferenceLine y={0} stroke="#ffffff30" />
                  <Bar dataKey="hist" name="Histogramme" fill="#64748b" />
                  <Line type="monotone" dataKey="macd" stroke="#22d3ee" strokeWidth={1.5} dot={false} name="MACD" />
                  <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Signal" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
