import { useEffect, useState } from 'react'
import PriceChart from './PriceChart'
import TimeframeSelector from './TimeframeSelector'
import { fetchCryptoChart } from '../services/coingecko'
import { DEFAULT_TIMEFRAME, getTimeframe } from '../config/timeframes'
import { formatPercent, formatPrice, formatVolume } from '../utils/format'

/**
 * Carte d'un actif crypto : logo, nom, prix, variation 24h, volume et graphique.
 * @param {{market:object, currency:string}} props  (market = objet /coins/markets)
 */
export default function CryptoCard({ market, currency = 'usd' }) {
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
        const points = await fetchCryptoChart(market.id, currency, tf.days)
        if (!cancelled) setChart(points)
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
  }, [market.id, currency, timeframe])

  const changePct = market.price_change_percentage_24h
  const positive = (changePct ?? 0) >= 0

  return (
    <div className="rounded-xl border border-white/5 bg-panel p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {market.image && (
            <img src={market.image} alt={market.name} className="h-8 w-8 rounded-full" />
          )}
          <div>
            <div className="font-semibold">{market.name}</div>
            <div className="text-xs uppercase text-gray-500">{market.symbol}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{formatPrice(market.current_price, currency)}</div>
          <div className={'text-sm font-medium ' + (positive ? 'text-up' : 'text-down')}>
            {formatPercent(changePct)}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Volume 24h : {formatVolume(market.total_volume, currency)}</span>
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
