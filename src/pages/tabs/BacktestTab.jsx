import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { runBacktest } from '../../services/analysis'

const STRATEGIES = [
  { key: 'sma_cross', label: 'Croisement SMA (50/200)' },
  { key: 'rsi_reversal', label: 'Retournement RSI (30/70)' },
]
const PERIODS = [
  { key: '1y', label: '1 an' },
  { key: '2y', label: '2 ans' },
  { key: '5y', label: '5 ans' },
]

function fmt(n, digits = 2, suffix = '') {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + suffix
  )
}

function MetricCard({ label, value, tone }) {
  const color =
    tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-gray-100'
  return (
    <div className="rounded-lg border border-white/5 bg-panel2 px-3 py-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={'mt-1 text-lg font-bold ' + color}>{value}</div>
    </div>
  )
}

export default function BacktestTab({ ticker }) {
  const [strategy, setStrategy] = useState('sma_cross')
  const [period, setPeriod] = useState('2y')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const launch = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runBacktest(ticker, {
        strategy,
        period,
        cash: 10000,
        commission: 0.002,
      })
      setResult(data)
    } catch (e) {
      setError(e.message || 'Échec du backtest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-white/5 bg-panel p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Stratégie</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="rounded-md border border-white/10 bg-panel2 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
          >
            {STRATEGIES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Période</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-white/10 bg-panel2 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={launch}
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
        >
          {loading ? 'Calcul en cours…' : 'Lancer le backtest'}
        </button>
        <p className="text-xs text-gray-500">Capital initial : 10 000 $ · Commission : 0,2 %</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Exécution du backtest…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-down/30 bg-down/10 p-4 text-sm text-down">
          {error}
          <div className="mt-1 text-xs text-gray-400">
            Le backend est-il démarré ? Certaines stratégies exigent un historique suffisant.
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              label="Rendement total"
              value={fmt(result.return_pct, 2, ' %')}
              tone={result.return_pct >= 0 ? 'up' : 'down'}
            />
            <MetricCard label="Sharpe" value={fmt(result.sharpe_ratio)} tone={result.sharpe_ratio >= 1 ? 'up' : undefined} />
            <MetricCard label="Drawdown max" value={fmt(result.max_drawdown_pct, 2, ' %')} tone="down" />
            <MetricCard label="Taux de gain" value={fmt(result.win_rate, 1, ' %')} />
            <MetricCard label="Nb trades" value={result.n_trades} />
          </div>

          <div className="mb-4 rounded-lg border border-white/5 bg-panel2 px-4 py-2 text-xs text-gray-400">
            Comparaison Buy &amp; Hold :{' '}
            <span className={result.buy_hold_return_pct >= 0 ? 'text-up' : 'text-down'}>
              {fmt(result.buy_hold_return_pct, 2, ' %')}
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-panel p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-300">Courbe de capital (equity curve)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={result.equity_curve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={40} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  width={65}
                  tickFormatter={(v) => fmt(v, 0, ' $')}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #ffffff20', fontSize: 12 }}
                  formatter={(v) => [fmt(v, 0, ' $'), 'Capital']}
                />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
