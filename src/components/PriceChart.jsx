import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPrice } from '../utils/format'

/**
 * Mini-graphique d'évolution de prix (aire).
 * @param {{data:{time:number,price:number}[], timeframeKey:string, currency:string, loading:boolean, error:string|null}} props
 */
export default function PriceChart({ data, timeframeKey, currency = 'usd', loading, error }) {
  const positive =
    data.length >= 2 ? data[data.length - 1].price >= data[0].price : true
  const color = positive ? '#16c784' : '#ea3943'
  const gradientId = `grad-${positive ? 'up' : 'down'}`

  // Format de l'axe X selon la plage : intraday -> heure, sinon date.
  const formatXAxis = (ts) => {
    const d = new Date(ts)
    if (timeframeKey === '24h') {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    if (timeframeKey === '1y') {
      return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        Chargement du graphique…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-down">
        {error}
      </div>
    )
  }
  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        Aucune donnée disponible pour cette période.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tickFormatter={formatXAxis}
          tick={{ fill: '#6b7280', fontSize: 10 }}
          minTickGap={40}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickFormatter={(v) => formatPrice(v, currency)}
          width={70}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#151b2b',
            border: '1px solid #2a3448',
            borderRadius: 8,
            color: '#e5e7eb',
            fontSize: 12,
          }}
          labelFormatter={(ts) =>
            new Date(ts).toLocaleString('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          }
          formatter={(v) => [formatPrice(v, currency), 'Prix']}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
