import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchStockQuote, hasFinnhubKey } from '../services/finnhub'

/**
 * Hook de récupération des cotations d'actions avec rafraîchissement auto.
 * @param {{symbol:string, name:string}[]} assets
 * @param {number} refreshIntervalMs
 * @param {*} configVersion  valeur qui, lorsqu'elle change, force un rechargement
 *                           (ex: modification de la clé API depuis l'interface)
 */
export function useStockData(assets, refreshIntervalMs = 60000, configVersion) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const symbols = assets.map((a) => a.symbol)
  const symbolsKey = symbols.join(',')

  const load = useCallback(async () => {
    if (!hasFinnhubKey()) {
      setError(
        'Clé Finnhub manquante. Configurez-la via « 🔑 Configurer les APIs ».',
      )
      setLoading(false)
      return
    }
    try {
      setError(null)
      // Finnhub ne fournit pas d'endpoint groupé sur le plan gratuit :
      // on interroge chaque symbole en parallèle.
      const results = await Promise.all(
        assets.map(async (asset) => {
          const quote = await fetchStockQuote(asset.symbol)
          return { ...asset, ...quote }
        }),
      )
      setData(results)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, configVersion])

  useEffect(() => {
    setLoading(true)
    load()
    timerRef.current = setInterval(load, refreshIntervalMs)
    return () => clearInterval(timerRef.current)
  }, [load, refreshIntervalMs])

  return { data, loading, error, lastUpdated, refresh: load }
}
