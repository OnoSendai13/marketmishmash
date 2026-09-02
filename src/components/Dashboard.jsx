import { useMemo } from 'react'
import CryptoCard from './CryptoCard'
import StockCard from './StockCard'
import { useCryptoData } from '../hooks/useCryptoData'
import { useStockData } from '../hooks/useStockData'
import { formatTime } from '../utils/format'
import assetsConfig from '../config/assets.json'

/** Bandeau d'état d'une section (mise à jour, erreur, chargement). */
function SectionStatus({ loading, error, lastUpdated }) {
  if (error) return <span className="text-xs text-down">⚠ {error}</span>
  if (loading) return <span className="text-xs text-gray-500">Chargement…</span>
  return (
    <span className="text-xs text-gray-500">
      Mis à jour à {formatTime(lastUpdated)}
    </span>
  )
}

export default function Dashboard() {
  const { crypto, stocks, settings } = assetsConfig
  const currency = settings?.currency || 'usd'
  const refreshMs = settings?.refreshIntervalMs || 60000

  const cryptoState = useCryptoData(crypto, currency, refreshMs)
  const stockState = useStockData(stocks, refreshMs)

  // Conserve l'ordre défini dans la config.
  const cryptoMarkets = useMemo(() => {
    const byId = new Map(cryptoState.data.map((m) => [m.id, m]))
    return crypto.map((c) => byId.get(c.id)).filter(Boolean)
  }, [cryptoState.data, crypto])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-8 flex flex-col gap-1 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <h1 className="text-2xl font-bold tracking-tight">MarketMishmash</h1>
        </div>
        <p className="text-sm text-gray-400">
          Suivi en temps réel des marchés — crypto &amp; actions. Rafraîchissement automatique
          toutes les {Math.round(refreshMs / 1000)} s.
        </p>
      </header>

      {/* Section Crypto */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Crypto <span className="text-gray-500">({crypto.length})</span>
          </h2>
          <SectionStatus
            loading={cryptoState.loading}
            error={cryptoState.error}
            lastUpdated={cryptoState.lastUpdated}
          />
        </div>
        {cryptoState.loading && cryptoMarkets.length === 0 ? (
          <p className="text-sm text-gray-500">Chargement des cryptos…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cryptoMarkets.map((market) => (
              <CryptoCard key={market.id} market={market} currency={currency} />
            ))}
          </div>
        )}
      </section>

      {/* Section Actions */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Actions <span className="text-gray-500">({stocks.length})</span>
          </h2>
          <SectionStatus
            loading={stockState.loading}
            error={stockState.error}
            lastUpdated={stockState.lastUpdated}
          />
        </div>
        {stockState.error && stockState.data.length === 0 ? (
          <div className="rounded-lg border border-down/30 bg-down/10 p-4 text-sm text-down">
            {stockState.error}
          </div>
        ) : stockState.loading && stockState.data.length === 0 ? (
          <p className="text-sm text-gray-500">Chargement des actions…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stockState.data.map((quote) => (
              <StockCard key={quote.symbol} quote={quote} currency="usd" />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 border-t border-white/5 pt-4 text-center text-xs text-gray-600">
        Données : CoinGecko (crypto) &amp; Finnhub (actions). Projet à but pédagogique — pas un
        conseil en investissement.
      </footer>
    </div>
  )
}
