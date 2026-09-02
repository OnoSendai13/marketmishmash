import { useMemo, useState } from 'react'
import CryptoCard from './CryptoCard'
import StockCard from './StockCard'
import AssetManager from './AssetManager'
import ApiManager from './ApiManager'
import { useCryptoData } from '../hooks/useCryptoData'
import { useStockData } from '../hooks/useStockData'
import { useAssets } from '../hooks/useAssets'
import { useApiConfig } from '../hooks/useApiConfig'
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
  // Réglages globaux (devise, intervalle) : toujours issus du fichier de config.
  const settings = assetsConfig.settings || {}
  const currency = settings.currency || 'usd'
  const refreshMs = settings.refreshIntervalMs || 60000

  // Liste des actifs : persistée en localStorage via useAssets.
  const {
    crypto,
    stocks,
    addCrypto,
    removeCrypto,
    addStock,
    removeStock,
    reset,
  } = useAssets()

  const [managerOpen, setManagerOpen] = useState(false)
  const [apiManagerOpen, setApiManagerOpen] = useState(false)

  // Configuration des APIs : sert à savoir si Finnhub est configurée et à
  // forcer un rechargement des données lorsqu'une clé change.
  const { config: apiConfig, isConfigured } = useApiConfig()
  const finnhubConfigured =
    isConfigured('finnhub') || Boolean(import.meta.env.VITE_FINNHUB_API_KEY &&
      import.meta.env.VITE_FINNHUB_API_KEY !== 'votre_cle_finnhub_ici')
  // Version de config : change à chaque modification de clé -> re-fetch.
  const apiVersion = useMemo(() => JSON.stringify(apiConfig), [apiConfig])

  const cryptoState = useCryptoData(crypto, currency, refreshMs, apiVersion)
  const stockState = useStockData(stocks, refreshMs, apiVersion)

  // Conserve l'ordre défini dans la config.
  const cryptoMarkets = useMemo(() => {
    const byId = new Map(cryptoState.data.map((m) => [m.id, m]))
    return crypto.map((c) => byId.get(c.id)).filter(Boolean)
  }, [cryptoState.data, crypto])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-8 flex flex-col gap-3 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="h-9 w-9" />
            <h1 className="text-2xl font-bold tracking-tight">MarketMishmash</h1>
          </div>
          <p className="text-sm text-gray-400">
            Suivi en temps réel des marchés — crypto &amp; actions. Rafraîchissement automatique
            toutes les {Math.round(refreshMs / 1000)} s.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setApiManagerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-panel px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-accent hover:text-white"
          >
            🔑 Configurer les APIs
          </button>
          <button
            type="button"
            onClick={() => setManagerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-panel px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-accent hover:text-white"
          >
            ⚙️ Gérer mes actifs
          </button>
        </div>
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
        {crypto.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune crypto suivie. Cliquez sur « ⚙️ Gérer mes actifs » pour en ajouter.
          </p>
        ) : cryptoState.loading && cryptoMarkets.length === 0 ? (
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
        {!finnhubConfigured && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <span>⚠ La clé API Finnhub n'est pas configurée : les données des actions ne s'afficheront pas.</span>
            <button
              type="button"
              onClick={() => setApiManagerOpen(true)}
              className="rounded-md bg-amber-500/20 px-2 py-1 font-medium text-amber-200 transition-colors hover:bg-amber-500/30"
            >
              🔑 Configurer maintenant
            </button>
          </div>
        )}
        {stocks.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune action suivie. Cliquez sur « ⚙️ Gérer mes actifs » pour en ajouter.
          </p>
        ) : stockState.error && stockState.data.length === 0 ? (
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

      <AssetManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        crypto={crypto}
        stocks={stocks}
        onAddCrypto={addCrypto}
        onRemoveCrypto={removeCrypto}
        onAddStock={addStock}
        onRemoveStock={removeStock}
        onReset={reset}
      />

      <ApiManager open={apiManagerOpen} onClose={() => setApiManagerOpen(false)} />
    </div>
  )
}
