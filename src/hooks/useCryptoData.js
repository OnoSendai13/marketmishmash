import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCryptoMarkets } from '../services/coingecko'

/**
 * Hook de récupération des données de marché crypto avec rafraîchissement auto.
 * @param {{id:string, symbol:string, name:string}[]} assets
 * @param {string} currency
 * @param {number} refreshIntervalMs
 */
export function useCryptoData(assets, currency = 'usd', refreshIntervalMs = 60000) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const ids = assets.map((a) => a.id)
  const idsKey = ids.join(',')

  const load = useCallback(async () => {
    try {
      setError(null)
      const markets = await fetchCryptoMarkets(ids, currency)
      setData(markets)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, currency])

  useEffect(() => {
    setLoading(true)
    load()
    timerRef.current = setInterval(load, refreshIntervalMs)
    return () => clearInterval(timerRef.current)
  }, [load, refreshIntervalMs])

  return { data, loading, error, lastUpdated, refresh: load }
}
