// Registre des plateformes d'API connues, pré-configurées.
// Chaque entrée décrit une plateforme et sert à générer les cartes du
// panneau de configuration (composant ApiManager).
//
// Champs :
//   id            : identifiant interne unique (clé de stockage)
//   name          : nom affiché
//   description   : courte description de l'offre
//   baseUrl       : URL de base de l'API
//   docsUrl       : lien vers la documentation
//   signupUrl     : lien d'inscription / obtention de clé
//   requiresKey   : true si une clé est obligatoire pour fonctionner
//   keyLabel      : libellé du champ de saisie de la clé
//   keyPlaceholder: exemple de format de clé
//   category      : "crypto" | "stocks" (badge de catégorie)
export const API_REGISTRY = [
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Actions US, forex, crypto',
    baseUrl: 'https://finnhub.io/api/v1',
    docsUrl: 'https://finnhub.io/docs/api',
    signupUrl: 'https://finnhub.io/register',
    requiresKey: true,
    keyLabel: 'Clé API',
    keyPlaceholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'stocks',
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    description: 'Crypto — gratuit sans clé, clé optionnelle pour plus de quota',
    baseUrl: 'https://api.coingecko.com/api/v3',
    docsUrl: 'https://www.coingecko.com/api/documentation',
    signupUrl: 'https://www.coingecko.com/en/api/pricing',
    requiresKey: false,
    keyLabel: 'Clé API (optionnelle)',
    keyPlaceholder: 'CG-xxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'crypto',
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    description: 'Actions, forex, crypto, indicateurs techniques',
    baseUrl: 'https://www.alphavantage.co/query',
    docsUrl: 'https://www.alphavantage.co/documentation/',
    signupUrl: 'https://www.alphavantage.co/support/#api-key',
    requiresKey: true,
    keyLabel: 'Clé API',
    keyPlaceholder: 'XXXXXXXXXXXXXXXX',
    category: 'stocks',
  },
  {
    id: 'coinmarketcap',
    name: 'CoinMarketCap',
    description: 'Crypto — données de marché complètes',
    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
    docsUrl: 'https://coinmarketcap.com/api/documentation/v1/',
    signupUrl: 'https://pro.coinmarketcap.com/signup',
    requiresKey: true,
    keyLabel: 'Clé API',
    keyPlaceholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    category: 'crypto',
  },
  {
    id: 'fmp',
    name: 'Financial Modeling Prep',
    description: 'Actions, fondamentaux, données financières',
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    docsUrl: 'https://financialmodelingprep.com/developer/docs',
    signupUrl: 'https://financialmodelingprep.com/register',
    requiresKey: true,
    keyLabel: 'Clé API',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    category: 'stocks',
  },
]

// Libellés des catégories (affichage badge).
export const CATEGORY_LABELS = {
  crypto: 'Crypto',
  stocks: 'Actions',
}

export function getRegistryEntry(id) {
  return API_REGISTRY.find((p) => p.id === id) || null
}
