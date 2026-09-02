import { useEffect, useState } from 'react'
import { API_REGISTRY, CATEGORY_LABELS } from '../config/apiRegistry'
import { useApiConfig } from '../hooks/useApiConfig'

/** Badge de catégorie (Crypto / Actions). */
function CategoryBadge({ category }) {
  const label = CATEGORY_LABELS[category] || category
  const color =
    category === 'crypto'
      ? 'bg-amber-500/15 text-amber-300'
      : 'bg-sky-500/15 text-sky-300'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
    </span>
  )
}

/** Badge d'état de configuration. */
function StatusBadge({ configured, requiresKey }) {
  if (configured) {
    return (
      <span className="rounded-full bg-up/15 px-2 py-0.5 text-[11px] font-medium text-up">
        Configurée ✅
      </span>
    )
  }
  if (!requiresKey) {
    return (
      <span className="rounded-full bg-up/10 px-2 py-0.5 text-[11px] font-medium text-up/90">
        Fonctionnelle sans clé
      </span>
    )
  }
  return (
    <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[11px] font-medium text-gray-400">
      Non configurée
    </span>
  )
}

/** Carte d'une plateforme du registre. */
function PlatformCard({ platform, configured, currentKey, onSave, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentKey || '')

  useEffect(() => {
    setValue(currentKey || '')
  }, [currentKey])

  function handleSave() {
    onSave(platform.id, value)
    setEditing(false)
  }

  return (
    <div className="rounded-xl border border-white/5 bg-panel2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-gray-100">{platform.name}</h4>
            <CategoryBadge category={platform.category} />
            <StatusBadge configured={configured} requiresKey={platform.requiresKey} />
          </div>
          <p className="mt-1 text-xs text-gray-400">{platform.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a
              href={platform.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              📖 Documentation
            </a>
            <a
              href={platform.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              🔑 Obtenir une clé
            </a>
          </div>
        </div>
      </div>

      {/* Zone de configuration */}
      {editing ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-gray-400">
            {platform.keyLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={platform.keyPlaceholder}
              className="flex-1 rounded-md border border-white/10 bg-panel px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
            >
              Sauvegarder
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setValue(currentKey || '')
              }}
              className="rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-panel hover:text-gray-200"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-white/10 bg-panel px-3 py-1.5 text-sm text-gray-200 transition-colors hover:border-accent hover:text-white"
          >
            {configured
              ? 'Modifier la clé'
              : platform.requiresKey
                ? 'Configurer'
                : 'Ajouter une clé (optionnel)'}
          </button>
          {configured && (
            <>
              <span className="text-xs text-gray-500">
                Clé enregistrée : {maskKey(currentKey)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(platform.id)}
                className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-down/20 hover:text-down"
              >
                🗑 Supprimer la clé
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Masque une clé API pour l'affichage (garde les 4 derniers caractères). */
function maskKey(key) {
  if (!key) return ''
  if (key.length <= 4) return '••••'
  return '••••' + key.slice(-4)
}

/** Carte d'une plateforme personnalisée (ajoutée par l'utilisateur). */
function CustomCard({ entry, onRemove }) {
  return (
    <div className="rounded-xl border border-white/5 bg-panel2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-gray-100">{entry.name}</h4>
            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-300">
              Personnalisée
            </span>
            <StatusBadge configured={Boolean(entry.key)} requiresKey />
          </div>
          <p className="mt-1 break-all text-xs text-gray-400">{entry.baseUrl}</p>
          {entry.key && (
            <p className="mt-1 text-xs text-gray-500">
              Clé enregistrée : {maskKey(entry.key)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-down/20 hover:text-down"
        >
          🗑 Supprimer
        </button>
      </div>
    </div>
  )
}

/** Formulaire d'ajout d'une plateforme personnalisée. */
function CustomForm({ onAdd }) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState(null)

  function handleAdd() {
    const err = onAdd({ name, baseUrl, key })
    if (err) {
      setError(err)
      return
    }
    setName('')
    setBaseUrl('')
    setKey('')
    setError(null)
  }

  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-panel2/50 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          placeholder="Nom (ex : Twelve Data)"
          className="rounded-md border border-white/10 bg-panel px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value)
            setError(null)
          }}
          placeholder="URL de base (https://...)"
          className="rounded-md border border-white/10 bg-panel px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Clé API (facultatif)"
          className="rounded-md border border-white/10 bg-panel px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
        />
      </div>
      {error && <p className="mt-2 text-xs text-down">⚠ {error}</p>}
      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
      >
        Ajouter la plateforme
      </button>
    </div>
  )
}

/**
 * Panneau (modal) de configuration des APIs.
 * @param {{open:boolean, onClose:()=>void}} props
 */
export default function ApiManager({ open, onClose }) {
  const {
    getEntry,
    isConfigured,
    setKey,
    removeKey,
    addCustom,
    removeCustom,
    customEntries,
    resetAll,
  } = useApiConfig()

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">🔑 Configurer les APIs</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Vos clés sont enregistrées localement dans votre navigateur (localStorage) et ne
              sont jamais envoyées ailleurs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md px-2 py-1 text-xl leading-none text-gray-400 transition-colors hover:bg-panel2 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          {/* Plateformes connues */}
          <section>
            <h3 className="mb-3 text-base font-semibold">Plateformes disponibles</h3>
            <div className="space-y-3">
              {API_REGISTRY.map((platform) => {
                const entry = getEntry(platform.id)
                return (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    configured={isConfigured(platform.id)}
                    currentKey={entry?.key || ''}
                    onSave={setKey}
                    onRemove={removeKey}
                  />
                )
              })}
            </div>
          </section>

          {/* Plateformes personnalisées */}
          <section>
            <h3 className="mb-1 text-base font-semibold">
              Ajouter une plateforme manuellement
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Enregistrez une plateforme non listée avec son nom, son URL de base et,
              éventuellement, une clé API.
            </p>

            {customEntries.length > 0 && (
              <div className="mb-3 space-y-3">
                {customEntries.map((entry) => (
                  <CustomCard key={entry.id} entry={entry} onRemove={removeCustom} />
                ))}
              </div>
            )}

            <CustomForm onAdd={addCustom} />
          </section>
        </div>

        {/* Pied de page */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-panel2 hover:text-gray-200"
          >
            Tout réinitialiser
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
