import { TIMEFRAMES } from '../config/timeframes'

/**
 * Sélecteur de plage temporelle (24h, 7j, 30j, 90j, 1an).
 * @param {{value:string, onChange:(key:string)=>void}} props
 */
export default function TimeframeSelector({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-panel2 p-0.5">
      {TIMEFRAMES.map((tf) => {
        const active = tf.key === value
        return (
          <button
            key={tf.key}
            type="button"
            onClick={() => onChange(tf.key)}
            className={
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors ' +
              (active
                ? 'bg-accent text-white'
                : 'text-gray-400 hover:text-gray-200')
            }
            aria-pressed={active}
          >
            {tf.label}
          </button>
        )
      })}
    </div>
  )
}
