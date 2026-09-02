import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import TechnicalTab from './tabs/TechnicalTab'
import FundamentalsTab from './tabs/FundamentalsTab'
import BacktestTab from './tabs/BacktestTab'
import { fetchStockQuote } from '../services/finnhub'
import { fetchCryptoMarkets } from '../services/coingecko'
import { formatPrice, formatPercent } from '../utils/format'

const TABS = [
  { key: 'technical', label: 'Analyse Technique' },
  { key: 'fundamentals', label: 'Fondamentaux & News' },
  { key: 'backtest', label: 'Backtest' },
]

export default function DetailPage() {
  const { ticker } = useParams()
  const [searchParams] = useSearchParams()

  const type = searchParams.get('type') || 'stock'
  const isCrypto = type === 'crypto'
  const name = searchParams.get('name') || ticker
  const symbol = searchParams.get('symbol') || ticker
  const cryptoId = searchParams.get('id') || ''

  const [activeTab, setActiveTab] = useState('technical')
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState(null)

  // Prix courant : réutilise les services existants (Finnhub / CoinGecko).
  useEffect(() => {
    let cancelled = false
    setQuote(null)
    setQuoteError(null)
    async function load() {
      try {
        if (isCrypto && cryptoId) {
          const markets = await fetchCryptoMarkets([cryptoId], 'usd')
          const m = markets[0]
          if (m && !cancelled) {
            setQuote({ price: m.current_price, changePercent: m.price_change_percentage_24h, image: m.image })
          }
        } else if (!isCrypto) {
          const q = await fetchStockQuote(symbol)
          if (!cancelled) setQuote({ price: q.price, changePercent: q.changePercent })
        }
      } catch (e) {
        if (!cancelled) setQuoteError(e.message || 'Prix indisponible')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isCrypto, cryptoId, symbol])

  const positive = (quote?.changePercent ?? 0) >= 0

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'fundamentals':
        return <FundamentalsTab ticker={ticker} isCrypto={isCrypto} symbol={symbol} />
      case 'backtest':
        return <BacktestTab ticker={ticker} />
      case 'technical':
      default:
        return <TechnicalTab ticker={ticker} />
    }
  }, [activeTab, ticker, isCrypto, symbol])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* En-tête */}
      <header className="mb-6 border-b border-white/5 pb-5">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-accent"
        >
          ← Retour au tableau de bord
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {quote?.image && (
              <img src={quote.image} alt={name} className="h-10 w-10 rounded-full" />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="uppercase">{symbol}</span>
                <span className="rounded bg-panel2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  {isCrypto ? 'Crypto' : 'Action'}
                </span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-600">{ticker}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            {quote ? (
              <>
                <div className="text-2xl font-bold">{formatPrice(quote.price, 'usd')}</div>
                <div className={'text-sm font-medium ' + (positive ? 'text-up' : 'text-down')}>
                  {formatPercent(quote.changePercent)}
                </div>
              </>
            ) : quoteError ? (
              <div className="text-xs text-gray-500">Prix indisponible</div>
            ) : (
              <div className="text-xs text-gray-500">Chargement du prix…</div>
            )}
          </div>
        </div>
      </header>

      {/* Onglets */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-white/5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={
              'relative px-4 py-2.5 text-sm font-medium transition-colors ' +
              (activeTab === t.key
                ? 'text-accent'
                : 'text-gray-400 hover:text-gray-200')
            }
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet actif */}
      <div>{tabContent}</div>

      <footer className="mt-10 border-t border-white/5 pt-4 text-center text-xs text-gray-600">
        Analyse fournie à titre pédagogique — pas un conseil en investissement.
      </footer>
    </div>
  )
}
