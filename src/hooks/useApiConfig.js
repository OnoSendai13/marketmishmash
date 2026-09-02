import { useCallback, useEffect, useState } from 'react'
import { readConfig, subscribe, writeConfig } from '../services/apiStore'

/**
 * Hook de gestion de la configuration des APIs (clés + plateformes custom).
 * La configuration est persistée en localStorage via apiStore, partagé avec
 * les services pour une lecture au runtime.
 *
 * Format d'une entrée :
 *   { key: "...", enabled: true }                       // plateforme du registre
 *   { name, baseUrl, key, enabled, custom: true }       // plateforme custom
 *
 * @returns {{
 *   config: object,
 *   getEntry: (id:string) => object|undefined,
 *   isConfigured: (id:string) => boolean,
 *   setKey: (id:string, key:string) => void,
 *   removeKey: (id:string) => void,
 *   setEnabled: (id:string, enabled:boolean) => void,
 *   addCustom: (data:{name:string, baseUrl:string, key?:string}) => string|null,
 *   removeCustom: (id:string) => void,
 *   resetAll: () => void,
 * }}
 */
export function useApiConfig() {
  const [config, setConfig] = useState(readConfig)

  // Synchronisation avec le magasin partagé (autres onglets, services...).
  useEffect(() => {
    const unsub = subscribe((next) => setConfig(next))
    return unsub
  }, [])

  const update = useCallback((mutator) => {
    setConfig((prev) => {
      const next = mutator({ ...prev })
      writeConfig(next)
      return next
    })
  }, [])

  const getEntry = useCallback((id) => config[id], [config])

  const isConfigured = useCallback(
    (id) => {
      const entry = config[id]
      return Boolean(entry && typeof entry.key === 'string' && entry.key.trim())
    },
    [config],
  )

  const setKey = useCallback(
    (id, key) => {
      update((next) => {
        const existing = next[id] || {}
        next[id] = { ...existing, key: (key || '').trim(), enabled: true }
        return next
      })
    },
    [update],
  )

  const removeKey = useCallback(
    (id) => {
      update((next) => {
        if (next[id]) {
          next[id] = { ...next[id], key: '' }
        }
        return next
      })
    },
    [update],
  )

  const setEnabled = useCallback(
    (id, enabled) => {
      update((next) => {
        const existing = next[id] || {}
        next[id] = { ...existing, enabled: Boolean(enabled) }
        return next
      })
    },
    [update],
  )

  // Ajoute une plateforme custom. Retourne un message d'erreur ou null.
  const addCustom = useCallback(
    (data) => {
      const name = (data.name || '').trim()
      const baseUrl = (data.baseUrl || '').trim()
      if (!name) return 'Le nom de la plateforme est requis.'
      if (!baseUrl) return "L'URL de base est requise."
      const id = `custom_${Date.now()}`
      update((next) => {
        next[id] = {
          name,
          baseUrl,
          key: (data.key || '').trim(),
          enabled: true,
          custom: true,
        }
        return next
      })
      return null
    },
    [update],
  )

  const removeCustom = useCallback(
    (id) => {
      update((next) => {
        delete next[id]
        return next
      })
    },
    [update],
  )

  const resetAll = useCallback(() => {
    update(() => ({}))
  }, [update])

  // Liste des plateformes custom (dérivée du config).
  const customEntries = Object.entries(config)
    .filter(([, v]) => v && v.custom)
    .map(([id, v]) => ({ id, ...v }))

  return {
    config,
    customEntries,
    getEntry,
    isConfigured,
    setKey,
    removeKey,
    setEnabled,
    addCustom,
    removeCustom,
    resetAll,
  }
}
