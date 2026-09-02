// Magasin partagé de configuration des APIs.
//
// Il centralise la lecture/écriture de la configuration des clés API dans
// localStorage (clé « marketmishmash_apis »). Ce module est volontairement
// SANS dépendance à React : il peut donc être utilisé aussi bien par le hook
// useApiConfig (UI) que par les services (coingecko.js, finnhub.js) au runtime.
//
// Format stocké :
//   {
//     finnhub:     { key: "pk_xxx", enabled: true },
//     coingecko:   { key: "",       enabled: true },
//     custom_1234: { name: "...", baseUrl: "...", key: "...", enabled: true }
//   }

export const STORAGE_KEY = 'marketmishmash_apis'

const listeners = new Set()

function isBrowser() {
  return typeof window !== 'undefined' && !!window.localStorage
}

/** Lit la configuration complète depuis localStorage. */
export function readConfig() {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Écrit la configuration complète et notifie les abonnés. */
export function writeConfig(config) {
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // quota / stockage indisponible : ignoré
    }
  }
  listeners.forEach((fn) => {
    try {
      fn(config)
    } catch {
      /* noop */
    }
  })
}

/**
 * Retourne la clé API configurée pour une plateforme donnée.
 * @param {string} id                 identifiant de plateforme (ex: "finnhub")
 * @param {string} [envFallback]      valeur de repli (ex: import.meta.env...)
 * @returns {string} la clé (chaîne vide si aucune)
 */
export function getApiKey(id, envFallback = '') {
  const entry = readConfig()[id]
  const key = entry && typeof entry.key === 'string' ? entry.key.trim() : ''
  if (key) return key
  // Repli sur la variable d'environnement si le localStorage est vide.
  return (envFallback || '').trim()
}

/** Indique si une plateforme est activée (par défaut true si non renseignée). */
export function isEnabled(id) {
  const entry = readConfig()[id]
  if (!entry) return true
  return entry.enabled !== false
}

/**
 * Abonnement aux changements de configuration.
 * @param {(config:object)=>void} fn
 * @returns {()=>void} fonction de désabonnement
 */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Synchronisation entre onglets : un changement de localStorage dans un autre
// onglet déclenche l'événement « storage » et notifie les abonnés locaux.
if (isBrowser()) {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      listeners.forEach((fn) => {
        try {
          fn(readConfig())
        } catch {
          /* noop */
        }
      })
    }
  })
}
