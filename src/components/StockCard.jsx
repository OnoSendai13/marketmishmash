import { useEffect, useState } from 'react'
import PriceChart from './PriceChart'
import TimeframeSelector from './TimeframeSelector'
import { fetchStockChartYahoo } from '../services/yahoo'
import { DEFAULT_TIMEFRAME, getTimeframe } from '../config/timeframes'
import { formatPercent, formatPrice } from '../utils/format'

/**
 * Carte d'une action : symbole, nom, prix, variation du jour et graphique.
 * @param {{quote:object, currency:string}} props  (quote = {symbol, name, price, change, changePercent...})
 */
export default function StockCard({ quote, currency = 'usd' }) {
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME)
  const [chart, setChart] = useState([])
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError, setChartError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setChartLoading(true)
      setChartError(null)
      try {
        const tf = getTimeframe(timeframe)
        // Historique fourni par Yahoo Finance (le prix temps réel vient de Finnhub).
        const points = await fetchStockChartYahoo(
          quote.symbol,
          tf.yahooRange,
          tf.yahooInterval,
        )
        if (!cancelled) {
          setChart(points)
          if (points.length === 0) {
            setChartError(
              "Historique indisponible pour ce symbole sur cette période.",
            )
          }
        }
      } catch (err) {
        if (!cancelled) setChartError(err.message || 'Erreur de chargement')
      } finally {
        if (!cancelled) setChartLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [quote.symbol, timeframe])

  const positive = (quote.changePercent ?? 0) >= 0

  return (
    <div className="rounded-xl border border-white/5 bg-panel p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-panel2 text-xs font-bold text-accent">
            {quote.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="font-semibold">{quote.name}</div>
            <div className="text-xs uppercase text-gray-500">{quote.symbol}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{formatPrice(quote.price, currency)}</div>
          <div className={'text-sm font-medium ' + (positive ? 'text-up' : 'text-down')}>
            {formatPercent(quote.changePercent)}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          Ouv. {formatPrice(quote.open, currency)} · Clôt. préc. {formatPrice(quote.previousClose, currency)}
        </span>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      <div className="mt-3">
        <PriceChart
          data={chart}
          timeframeKey={timeframe}
          currency={currency}
          loading={chartLoading}
          error={chartError}
        />
      </div>
    </div>
  )
}
