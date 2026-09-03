import { useEffect, useState } from 'react'
import { fetchNewsAV, fetchNews } from '../../services/analysis'

// Normalise un libellé de sentiment (Alpha Vantage OU finvizfinance/VADER)
// vers 3 classes internes : 'bullish' | 'bearish' | 'neutral'.
function normLabel(label, score) {
  const l = String(label || '').toLowerCase()
  if (l.includes('bull') || l.includes('hauss') || l.includes('positive')) return 'bullish'
  if (l.includes('bear') || l.includes('baiss') || l.includes('negative')) return 'bearish'
  if (l === 'neutral' || l === 'neutre') return 'neutral'
  // Sinon, on déduit du score.
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
        <span className="opacity-70">{score >= 0 ? '+' : ''}{score.toFixed(2)}</span>
      )}
    </span>
  )
}

// Formate « 20240115T133000 » (Alpha Vantage) ou une date ISO/texte en date FR lisible.
function formatDate(raw) {
  if (!raw) return ''
  let d
  const s = String(raw)
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/)
  if (m) {
    d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`)
  } else {
    d = new Date(s)
  }
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NewsTab({ ticker }) {
  const [data, setData] = useState(null)
  const [source, setSource] = useState(null) // 'alphavantage' | 'finviz'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)

    async function load() {
      // 1) Alpha Vantage en priorité.
      try {
        const av = await fetchNewsAV(ticker)
        if (av && av.items && av.items.length > 0) {
          if (!cancelled) {
            setSource('alphavantage')
            setData({
              averageScore: av.average_score,
              averageLabel: normLabel(av.average_label, av.average_score),
              items: av.items.map((it) => ({
                title: it.title,
                url: it.url,
                source: it.source,
                date: it.time_published,
                summary: it.summary,
                score:
                  typeof it.ticker_sentiment_score === 'number'
                    ? it.ticker_sentiment_score
                    : it.overall_sentiment_score,
                label: normLabel(
                  it.ticker_sentiment_label || it.overall_sentiment_label,
                  it.ticker_sentiment_score ?? it.overall_sentiment_score,
                ),
              })),
            })
          }
          return
        }
      } catch {
        /* on bascule sur le fallback finvizfinance */
      }

      // 2) Fallback finvizfinance (+ VADER).
      try {
        const fv = await fetchNews(ticker)
        if (cancelled) return
        setSource('finviz')
        setData({
          averageScore: fv.average_score,
          averageLabel: normLabel(fv.label, fv.average_score),
          items: (fv.items || []).map((it) => ({
            title: it.title,
            url: it.link,
            source: it.source,
            date: it.date,
            summary: '',
            score: it.sentiment_score,
            label: normLabel(it.sentiment_label, it.sentiment_score),
          })),
        })
      } catch (e) {
        if (!cancelled) setError(e.message || 'Actualités indisponibles')
      }
    }

    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [ticker])

  if (loading) return <p className="text-sm text-gray-500">Chargement des actualités…</p>

  if (error) {
    return (
      <div className="rounded-lg border border-down/30 bg-down/10 p-4 text-sm text-down">
        {error}
        <div className="mt-1 text-xs text-gray-400">
          Les actualités ne concernent principalement que les actions américaines.
          Vérifiez aussi que le backend est démarré.
        </div>
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return <p className="text-sm text-gray-500">Aucune actualité disponible pour « {ticker} ».</p>
  }

  // Barre de progression : score [-1, 1] → largeur [0, 100] %.
  const pct = Math.round(((Math.max(-1, Math.min(1, data.averageScore || 0)) + 1) / 2) * 100)

  return (
    <div>
      {/* Sentiment global */}
      <div className="mb-6 rounded-xl border border-white/5 bg-panel p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-300">Sentiment global</h3>
          <SentimentBadge cls={data.averageLabel} score={data.averageScore} />
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={'h-full rounded-full transition-all ' + BAR_COLORS[data.averageLabel]}
            style={{ width: pct + '%' }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span>Baissier</span>
          <span>Neutre</span>
          <span>Haussier</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Source : {source === 'alphavantage' ? 'Alpha Vantage (NEWS_SENTIMENT)' : 'Finviz + VADER'} ·{' '}
          {data.items.length} article{data.items.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Grille de cartes news */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.items.map((it, i) => (
          <a
            key={i}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2 rounded-xl border border-white/5 bg-panel p-4 transition-colors hover:border-accent/40 hover:bg-panel2"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold leading-snug text-gray-100">{it.title}</h4>
              <SentimentBadge cls={it.label} score={it.score} />
            </div>
            {it.summary && (
              <p
                className="text-xs leading-relaxed text-gray-400"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {it.summary}
              </p>
            )}
            <div className="mt-auto flex items-center gap-2 text-[11px] text-gray-500">
              <span className="font-medium text-gray-400">{it.source}</span>
              {it.date && <span>· {formatDate(it.date)}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
