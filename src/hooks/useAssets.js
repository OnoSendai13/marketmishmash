import { useCallback, useEffect, useState } from 'react'
import defaultAssets from '../config/assets.json'

// Clé de stockage local de la liste des actifs suivis.
export const STORAGE_KEY = 'marketmishmash_assets'

// Valeurs par défaut issues du fichier de configuration statique.
// Utilisées uniquement au premier lancement (localStorage vide).
const DEFAULTS = {
  crypto: defaultAssets.crypto || [],
  stocks: defaultAssets.stocks || [],
}

function readFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULTS }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      crypto: Array.isArray(parsed.crypto) ? parsed.crypto : DEFAULTS.crypto,
      stocks: Array.isArray(parsed.stocks) ? parsed.stocks : DEFAULTS.stocks,
    }
  } catch {
    // Données corrompues : on repart des valeurs par défaut.
    return { ...DEFAULTS }
  }
}

function writeToStorage(assets) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets))
  } catch {
    // Quota dépassé ou stockage indisponible : on ignore silencieusement.
  }
}

/**
 * Hook partagé de gestion des actifs suivis (crypto + actions).
 * La liste est persistée en localStorage ; le fichier assets.json sert
 * uniquement de valeurs par défaut au premier lancement.
 *
 * @returns {{
 *   crypto: {id:string, symbol:string, name:string}[],
 *   stocks: {symbol:string, name:string}[],
 *   addCrypto: (asset:{id:string, symbol?:string, name?:string}) => string|null,
 *   removeCrypto: (id:string) => void,
 *   addStock: (asset:{symbol:string, name?:string}) => string|null,
 *   removeStock: (symbol:string) => void,
 *   reset: () => void,
 * }}
 */
export function useAssets() {
  const [assets, setAssets] = useState(readFromStorage)

  // Persistance à chaque changement.
  useEffect(() => {
    writeToStorage(assets)
  }, [assets])

  // Synchronisation entre onglets/fenêtres.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) {
        setAssets(readFromStorage())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Ajoute une crypto. Retourne un message d'erreur ou null si succès.
  const addCrypto = useCallback((asset) => {
    const id = (asset.id || '').trim().toLowerCase()
    if (!id) return "L'identifiant CoinGecko est requis."
    let error = null
    setAssets((prev) => {
      if (prev.crypto.some((c) => c.id === id)) {
        error = 'Cette crypto est déjà suivie.'
        return prev
      }
      const symbol = (asset.symbol || id).trim().toUpperCase()
      const name = (asset.name || asset.id || id).trim()
      return { ...prev, crypto: [...prev.crypto, { id, symbol, name }] }
    })
    return error
  }, [])

  const removeCrypto = useCallback((id) => {
    setAssets((prev) => ({
      ...prev,
      crypto: prev.crypto.filter((c) => c.id !== id),
    }))
  }, [])

  // Ajoute une action. Retourne un message d'erreur ou null si succès.
  const addStock = useCallback((asset) => {
    const symbol = (asset.symbol || '').trim().toUpperCase()
    if (!symbol) return 'Le symbole Finnhub est requis.'
    let error = null
    setAssets((prev) => {
      if (prev.stocks.some((s) => s.symbol === symbol)) {
        error = 'Cette action est déjà suivie.'
        return prev
      }
      const name = (asset.name || symbol).trim()
      return { ...prev, stocks: [...prev.stocks, { symbol, name }] }
    })
    return error
  }, [])

  const removeStock = useCallback((symbol) => {
    setAssets((prev) => ({
      ...prev,
      stocks: prev.stocks.filter((s) => s.symbol !== symbol),
    }))
  }, [])

  const reset = useCallback(() => {
    setAssets({ ...DEFAULTS })
  }, [])

  return {
    crypto: assets.crypto,
    stocks: assets.stocks,
    addCrypto,
    removeCrypto,
    addStock,
    removeStock,
    reset,
  }
}
