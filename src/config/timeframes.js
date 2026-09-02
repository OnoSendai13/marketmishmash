// Définition des plages temporelles disponibles pour les graphiques.
// `days`       : nombre de jours d'historique (utilisé par CoinGecko).
// `resolution` : résolution des bougies Finnhub (D = jour, 60 = 60 min...).
// `seconds`    : durée en secondes (utilisée pour calculer la fenêtre Finnhub).
export const TIMEFRAMES = [
  { key: '24h', label: '24h', days: 1, resolution: '30', seconds: 24 * 60 * 60 },
  { key: '7d', label: '7j', days: 7, resolution: '60', seconds: 7 * 24 * 60 * 60 },
  { key: '30d', label: '30j', days: 30, resolution: 'D', seconds: 30 * 24 * 60 * 60 },
  { key: '90d', label: '90j', days: 90, resolution: 'D', seconds: 90 * 24 * 60 * 60 },
  { key: '1y', label: '1an', days: 365, resolution: 'W', seconds: 365 * 24 * 60 * 60 },
]

export const DEFAULT_TIMEFRAME = '24h'

export function getTimeframe(key) {
  return TIMEFRAMES.find((t) => t.key === key) || TIMEFRAMES[0]
}
