import { useEffect, useState } from 'react'

/**
 * Champ + bouton d'ajout d'un actif, avec gestion d'un message d'erreur.
 */
function AddRow({ placeholder, secondaryPlaceholder, onAdd }) {
  const [value, setValue] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)

  function handleAdd() {
    const err = onAdd({ value: value.trim(), name: name.trim() })
    if (err) {
      setError(err)
      return
    }
    setValue('')
    setName('')
    setError(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-white/10 bg-panel2 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={secondaryPlaceholder}
          className="flex-1 rounded-md border border-white/10 bg-panel2 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
        >
          Ajouter
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-down">⚠ {error}</p>}
    </div>
  )
}

/**
 * Ligne d'un actif suivi avec bouton de suppression.
 */
function AssetRow({ primary, secondary, onRemove }) {
  return (
    <li className="flex items-center justify-between rounded-md bg-panel2 px-3 py-2">
      <div className="min-w-0">
        <span className="font-medium text-gray-200">{primary}</span>
        {secondary && (
          <span className="ml-2 truncate text-xs text-gray-500">{secondary}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Supprimer"
        aria-label={`Supprimer ${primary}`}
        className="ml-3 shrink-0 rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-down/20 hover:text-down"
      >
        🗑 Supprimer
      </button>
    </li>
  )
}

/**
 * Panneau (modal) de gestion des actifs suivis.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   crypto: {id:string, symbol:string, name:string}[],
 *   stocks: {symbol:string, name:string}[],
 *   onAddCrypto: (a:object) => string|null,
 *   onRemoveCrypto: (id:string) => void,
 *   onAddStock: (a:object) => string|null,
 *   onRemoveStock: (symbol:string) => void,
 *   onReset: () => void,
 * }} props
 */
export default function AssetManager({
  open,
  onClose,
  crypto,
  stocks,
  onAddCrypto,
  onRemoveCrypto,
  onAddStock,
  onRemoveStock,
  onReset,
}) {
  // Fermeture avec la touche Échap.
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
        className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold">⚙️ Gérer mes actifs</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md px-2 py-1 text-xl leading-none text-gray-400 transition-colors hover:bg-panel2 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-8 overflow-y-auto px-6 py-5">
          {/* Section Crypto */}
          <section>
            <h3 className="mb-1 text-base font-semibold">
              Crypto <span className="text-gray-500">({crypto.length})</span>
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Ajoutez une crypto via son <strong>identifiant CoinGecko</strong> (ex : « bitcoin »,
              « ethereum »). Le second champ (nom d'affichage) est facultatif.
            </p>
            <AddRow
              placeholder="ID CoinGecko (ex : bitcoin)"
              secondaryPlaceholder="Nom affiché (facultatif)"
              onAdd={({ value, name }) => onAddCrypto({ id: value, name })}
            />
            {crypto.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {crypto.map((c) => (
                  <AssetRow
                    key={c.id}
                    primary={c.symbol || c.id}
                    secondary={`${c.name} · ${c.id}`}
                    onRemove={() => onRemoveCrypto(c.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Aucune crypto suivie.</p>
            )}
          </section>

          {/* Section Actions */}
          <section>
            <h3 className="mb-1 text-base font-semibold">
              Actions <span className="text-gray-500">({stocks.length})</span>
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Ajoutez une action via son <strong>symbole Finnhub</strong> (ex : « AAPL »,
              « TSLA »). Le second champ (nom d'affichage) est facultatif.
            </p>
            <AddRow
              placeholder="Symbole Finnhub (ex : AAPL)"
              secondaryPlaceholder="Nom affiché (facultatif)"
              onAdd={({ value, name }) => onAddStock({ symbol: value, name })}
            />
            {stocks.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {stocks.map((s) => (
                  <AssetRow
                    key={s.symbol}
                    primary={s.symbol}
                    secondary={s.name}
                    onRemove={() => onRemoveStock(s.symbol)}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Aucune action suivie.</p>
            )}
          </section>
        </div>

        {/* Pied de page */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-panel2 hover:text-gray-200"
          >
            Réinitialiser
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
