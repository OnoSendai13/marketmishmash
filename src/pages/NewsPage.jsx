import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchGlobalNews } from '../services/analysis'

// ---------------------------------------------------------------------------
// Correspondance libellé FR (pills) -> topics Alpha Vantage.
// « Tous » n'envoie pas de topics (le backend applique son jeu par défaut).
// ---------------------------------------------------------------------------
const TOPIC_MAP = {
  Tous: '',
  Marchés: 'financial_markets',
  Macro: 'economy_macro,economy_monetary,economy_fiscal',
  Technologie: 'technology',
  Earnings: 'earnings',
  IPO: 'ipo',
  Crypto: 'blockchain',
  Forex: 'economy_monetary',
}
const TOPIC_LABELS = Object.keys(TOPIC_MAP)

const SENTIMENT_FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'bullish', label: 'Bullish' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'bearish', label: 'Bearish' },
]

// Normalise un libellé de sentiment vers 3 classes : 'bullish' | 'bearish' | 'neutral'.
function normLabel(label, score) {
  const l = String(label || '').toLowerCase()
  if (l.includes('bull') || l.includes('hauss') || l.includes('positive')) return 'bullish'
  if (l.includes('bear') || l.includes('baiss') || l.includes('negative')) return 'bearish'
  if (l === 'neutral' || l === 'neutre') return 'neutral'
  if (typeof score === 'number') {
    if (score >= 0.15) return 'bullish'
    if (score <= -0.15) return 'bearish'
  }
  return 'neutral'
}

const LABEL_FR = { bullish: 'Haussier', bearish: 'Baissier', neutral: 'Neutre' }
const LABEL_CLASSES = {
  bullish: 'bg-up/15 text-up border-up/30',
  bearish: 'bg-down/15 text-down border-down/30',
  neutral: 'bg-white/10 text-gray-300 border-white/15',
}
const BAR_COLORS = { bullish: 'bg-up', bearish: 'bg-down', neutral: 'bg-gray-400' }
const TOP_BAR = { bullish: 'bg-up', bearish: 'bg-down', neutral: 'bg-gray-500' }

// Formate « 20240115T133000 » (Alpha Vantage), « Sep-02 » / « 02:11AM » (finviz)
// ou une date ISO vers un libellé relatif FR (« il y a 2 h ») ou une date courte.
function formatRelative(raw) {
  if (!raw) return ''
  const s = String(raw)
  let d
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/)
  if (m) {
    d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`)
  } else if (/\d{4}/.test(s)) {
    // Chaîne contenant une année sur 4 chiffres (ISO, etc.).
    d = new Date(s)
  } else {
    // Format finviz sans année (« Sep-02 », « 02:11AM ») : affiché tel quel.
    return s
  }
  if (Number.isNaN(d.getTime())) return s

  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffJ = Math.round(diffH / 24)
  if (diffJ < 7) return `il y a ${diffJ} j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SentimentBadge({ cls, score }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ' +
        LABEL_CLASSES[cls]
      }
    >
      {LABEL_FR[cls]}
      {typeof score === 'number' && (
        <span className="opacity-70">
          {score >= 0 ? '+' : ''}
          {score.toFixed(2)}
        </span>
      )}
    </span>
  )
}

// Carte squelette (chargement).
function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-white/5 bg-panel">
      <div className="h-1 w-full bg-white/10" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-4 w-16 rounded-full bg-white/10" />
        </div>
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-white/5" />
      </div>
    </div>
  )
}

export default function NewsPage() {
  const navigate = useNavigate()

  const [rawItems, setRawItems] = useState([])
  const [provider, setProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Filtres.
  const [activeTopic, setActiveTopic] = useState('Tous')
  const [search, setSearch] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('all')

  const load = useCallback(async (topicLabel) => {
    setLoading(true)
    setError(null)
    try {
      const topics = TOPIC_MAP[topicLabel] || ''
      const data = await fetchGlobalNews(topics, 50)
      const items = (data.items || []).map((it) => ({
        title: it.title,
        url: it.url,
        source: it.source,
        date: it.time_published,
        summary: it.summary || '',
        score: it.overall_sentiment_score,
        label: normLabel(it.overall_sentiment_label, it.overall_sentiment_score),
        tickers: it.tickers_mentioned || [],
      }))
      setRawItems(items)
      setProvider(data.provider || null)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message || 'Actualités indisponibles')
      setRawItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(activeTopic)
  }, [activeTopic, load])

  // Filtrage côté client (recherche texte + sentiment).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rawItems.filter((it) => {
      if (sentimentFilter !== 'all' && it.label !== sentimentFilter) return false
      if (q) {
        const hay = `${it.title} ${it.summary}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rawItems, search, sentimentFilter])

  // Compteurs & sentiment moyen (sur les articles chargés, avant filtrage client).
  const stats = useMemo(() => {
    let bull = 0
    let neutral = 0
    let bear = 0
    const scores = []
    for (const it of rawItems) {
      if (it.label === 'bullish') bull += 1
      else if (it.label === 'bearish') bear += 1
      else neutral += 1
      if (typeof it.score === 'number') scores.push(it.score)
    }
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    return { bull, neutral, bear, avg, label: normLabel(null, avg) }
  }, [rawItems])

  // Jauge : score [-1, 1] -> position [0, 100] %.
  const gaugePct = Math.round(((Math.max(-1, Math.min(1, stats.avg)) + 1) / 2) * 100)

  const openTicker = (ticker) => {
    const t = String(ticker).toUpperCase()
    const q = new URLSearchParams({ type: 'stock', symbol: t, name: t })
    navigate(`/detail/${encodeURIComponent(t)}?${q}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Barre de navigation */}
      <header className="mb-6 flex flex-col gap-3 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-1 inline-flex w-fit items-center gap-1 rounded-lg border border-white/10 bg-panel px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-accent hover:text-white"
          >
            ← Retour au Dashboard
          </button>
          <h1 className="text-2xl font-bold tracking-tight">📰 Actualités des marchés</h1>
          <p className="text-sm text-gray-400">
            {lastUpdated
              ? `Dernière mise à jour à ${lastUpdated.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Chargement…'}
            {provider && (
              <span className="ml-2 text-gray-600">
                · Source : {provider === 'alphavantage' ? 'Alpha Vantage' : 'Finviz + VADER'}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(activeTopic)}
          disabled={loading}
          className="inline-flex h-fit shrink-0 items-center gap-2 self-start rounded-lg border border-white/10 bg-panel px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-accent hover:text-white disabled:opacity-50 sm:self-auto"
        >
          🔄 Actualiser
        </button>
      </header>

      {/* Bandeau de sentiment global */}
      <div className="mb-6 rounded-xl border border-white/5 bg-panel p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-300">Sentiment global du marché</h2>
          <SentimentBadge cls={stats.label} score={stats.avg} />
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-down/40 via-white/10 to-up/40">
          <div
            className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `calc(${gaugePct}% - 2px)` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span>Bearish</span>
          <span>Neutre</span>
          <span>Bullish</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span className="text-up">● {stats.bull} Bullish</span>
          <span className="text-gray-400">● {stats.neutral} Neutral</span>
          <span className="text-down">● {stats.bear} Bearish</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Topics */}
        <div className="flex flex-wrap gap-2">
          {TOPIC_LABELS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTopic(t)}
              className={
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                (activeTopic === t
                  ? 'border-accent bg-accent/20 text-white'
                  : 'border-white/10 bg-panel text-gray-300 hover:border-accent/50 hover:text-white')
              }
            >
              {t}
            </button>
          ))}
        </div>
        {/* Recherche + sentiment */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher dans les titres et résumés…"
            className="w-full rounded-lg border border-white/10 bg-panel px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none transition-colors focus:border-accent sm:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {SENTIMENT_FILTERS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSentimentFilter(s.key)}
                className={
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ' +
                  (sentimentFilter === s.key
                    ? 'border-accent bg-accent/20 text-white'
                    : 'border-white/10 bg-panel text-gray-300 hover:border-accent/50 hover:text-white')
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu */}
      {error ? (
        <div className="rounded-lg border border-down/30 bg-down/10 p-4 text-sm text-down">
          {error}
          <div className="mt-1 text-xs text-gray-400">
            Vérifiez que le backend est démarré (port 9100) et réessayez.
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          Aucun article ne correspond à vos filtres.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {filtered.length} article{filtered.length > 1 ? 's' : ''} affiché
            {filtered.length > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-xl border border-white/5 bg-panel transition-colors hover:border-accent/40"
              >
                {/* Barre de couleur selon le sentiment */}
                <div className={'h-1 w-full ' + TOP_BAR[it.label]} />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-medium text-gray-400">
                      {it.source}
                      {it.date && (
                        <span className="text-gray-600"> · {formatRelative(it.date)}</span>
                      )}
                    </span>
                    <SentimentBadge cls={it.label} score={it.score} />
                  </div>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold leading-snug text-gray-100 transition-colors hover:text-accent"
                  >
                    {it.title}
                  </a>
                  {it.summary && (
                    <p
                      className="text-xs leading-relaxed text-gray-400"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {it.summary}
                    </p>
                  )}
                  {it.tickers.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                      {it.tickers.map((tk) => (
                        <button
                          key={tk}
                          type="button"
                          onClick={() => openTicker(tk)}
                          className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/20"
                        >
                          ${tk}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="mt-10 border-t border-white/5 pt-4 text-center text-xs text-gray-600">
        Actualités : Alpha Vantage (NEWS_SENTIMENT) avec repli Finviz + VADER. Projet à but
        pédagogique — pas un conseil en investissement.
      </footer>
    </div>
  )
}
