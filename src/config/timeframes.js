// Définition des plages temporelles disponibles pour les graphiques.
// `days`         : nombre de jours d'historique (utilisé par CoinGecko / crypto).
// `resolution`   : résolution des bougies Finnhub (D = jour…). Conservé pour info,
//                  l'endpoint /stock/candle de Finnhub étant réservé aux plans payants.
// `seconds`      : durée en secondes (fenêtre Finnhub, conservé pour compatibilité).
// `yahooRange`   : plage Yahoo Finance (utilisée pour l'historique des actions).
// `yahooInterval`: intervalle des points Yahoo Finance.
export const TIMEFRAMES = [
  { key: '24h', label: '24h', days: 1, resolution: '30', seconds: 24 * 60 * 60, yahooRange: '1d', yahooInterval: '5m' },
  { key: '7d', label: '7j', days: 7, resolution: '60', seconds: 7 * 24 * 60 * 60, yahooRange: '5d', yahooInterval: '30m' },
  { key: '30d', label: '30j', days: 30, resolution: 'D', seconds: 30 * 24 * 60 * 60, yahooRange: '1mo', yahooInterval: '1d' },
  { key: '90d', label: '90j', days: 90, resolution: 'D', seconds: 90 * 24 * 60 * 60, yahooRange: '3mo', yahooInterval: '1d' },
  { key: '1y', label: '1an', days: 365, resolution: 'W', seconds: 365 * 24 * 60 * 60, yahooRange: '1y', yahooInterval: '1d' },
]

export const DEFAULT_TIMEFRAME = '24h'

export function getTimeframe(key) {
  return TIMEFRAMES.find((t) => t.key === key) || TIMEFRAMES[0]
}
