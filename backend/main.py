"""
MarketMishmash — Micro-backend d'analyse (Phase 1)
===================================================

API FastAPI fournissant l'analyse des valeurs (actions et crypto) au frontend :
  - Analyse technique (pandas-ta-classic) : RSI, MACD, Bollinger, EMA, ATR...
  - Fair Value Gaps / FVG (Smart Money Concepts)
  - Fondamentaux (finvizfinance) : ratios financiers des actions US
  - News + sentiment (finvizfinance + VADER, et Alpha Vantage NEWS_SENTIMENT)
  - News marché global (multi-topics Alpha Vantage, fallback finvizfinance)
  - Backtest de stratégies simples (backtesting.py)

Lancement :  uvicorn main:app --reload --port 9100
"""

from __future__ import annotations

import math
import os
import time
from typing import Any, Optional

import numpy as np
import pandas as pd
import requests
import yfinance as yf
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Indicateurs techniques -------------------------------------------------
import pandas_ta_classic as ta  # pandas-ta-classic s'importe sous "pandas_ta_classic"

# --- Sentiment --------------------------------------------------------------
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Charge les variables d'environnement depuis backend/.env (clé Alpha Vantage, etc.).
# On cible explicitement le .env situé à côté de ce fichier, pour que la clé soit
# chargée quel que soit le répertoire de lancement (start.sh, start.ps1, uvicorn direct).
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

app = FastAPI(
    title="MarketMishmash Analysis API",
    description="Analyse technique, fondamentale, news/sentiment et backtest.",
    version="1.0.0",
)

# CORS permissif pour le développement (frontend Vite sur un autre port).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_vader = SentimentIntensityAnalyzer()


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------
def get_alpha_vantage_key(request: Request) -> Optional[str]:
    """Résout la clé Alpha Vantage depuis le header HTTP ou la variable d'environnement.
    
    Priorité :
    1. Header 'X-Alpha-Vantage-Key' (configuré via l'interface utilisateur)
    2. Variable d'environnement ALPHA_VANTAGE_API_KEY (configurée dans backend/.env)
    
    Returns:
        La clé API si disponible, None sinon.
    """
    # Priorité 1 : header HTTP envoyé par le frontend (localStorage)
    header_key = request.headers.get("X-Alpha-Vantage-Key")
    if header_key:
        return header_key.strip()
    
    # Priorité 2 : variable d'environnement (.env)
    return ALPHA_VANTAGE_API_KEY



def _clean_float(value: Any) -> Optional[float]:
    """Convertit une valeur en float JSON-sûr (NaN/inf -> None)."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _download_ohlcv(ticker: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    """Télécharge l'historique OHLCV via yfinance et normalise les colonnes."""
    df = yf.download(
        ticker,
        period=period,
        interval=interval,
        auto_adjust=False,
        progress=False,
    )
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Aucune donnée trouvée pour « {ticker} » (période={period}, intervalle={interval}).",
        )
    # yfinance peut renvoyer un MultiIndex de colonnes quand un seul ticker est demandé.
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.rename(
        columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Adj Close": "adj_close",
            "Volume": "volume",
        }
    )
    df.index.name = "date"
    return df


# ---------------------------------------------------------------------------
# 1) Analyse technique
# ---------------------------------------------------------------------------
@app.get("/api/analysis/technical/{ticker}")
def technical_analysis(ticker: str, period: str = "6mo", interval: str = "1d") -> dict:
    """Retourne l'OHLCV enrichi de tous les indicateurs techniques."""
    df = _download_ohlcv(ticker, period=period, interval=interval)

    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]

    # --- Indicateurs (pandas-ta-classic) ---
    df["rsi_14"] = ta.rsi(close, length=14)

    macd = ta.macd(close, fast=12, slow=26, signal=9)
    if macd is not None and not macd.empty:
        df["macd"] = macd.iloc[:, 0]
        df["macd_hist"] = macd.iloc[:, 1]
        df["macd_signal"] = macd.iloc[:, 2]

    bbands = ta.bbands(close, length=20, std=2)
    if bbands is not None and not bbands.empty:
        df["bb_lower"] = bbands.iloc[:, 0]
        df["bb_mid"] = bbands.iloc[:, 1]
        df["bb_upper"] = bbands.iloc[:, 2]

    df["ema_20"] = ta.ema(close, length=20)
    df["ema_50"] = ta.ema(close, length=50)
    df["ema_200"] = ta.ema(close, length=200)
    df["atr_14"] = ta.atr(high, low, close, length=14)
    df["volume_sma_20"] = ta.sma(volume, length=20)

    # --- Construction de la réponse ---
    records = []
    for idx, row in df.iterrows():
        record = {"date": idx.strftime("%Y-%m-%d %H:%M:%S")}
        for col in df.columns:
            record[col] = _clean_float(row[col])
        records.append(record)

    # Résumé des dernières valeurs (dernière ligne complète).
    last = df.iloc[-1]
    macd_val = _clean_float(last.get("macd"))
    macd_sig = _clean_float(last.get("macd_signal"))
    macd_signal_label = "neutre"
    if macd_val is not None and macd_sig is not None:
        macd_signal_label = "haussier" if macd_val >= macd_sig else "baissier"

    summary = {
        "close": _clean_float(last.get("close")),
        "rsi_14": _clean_float(last.get("rsi_14")),
        "macd": macd_val,
        "macd_signal": macd_sig,
        "macd_hist": _clean_float(last.get("macd_hist")),
        "macd_trend": macd_signal_label,
        "ema_20": _clean_float(last.get("ema_20")),
        "ema_50": _clean_float(last.get("ema_50")),
        "ema_200": _clean_float(last.get("ema_200")),
        "atr_14": _clean_float(last.get("atr_14")),
        "bb_upper": _clean_float(last.get("bb_upper")),
        "bb_lower": _clean_float(last.get("bb_lower")),
    }

    return {
        "ticker": ticker.upper(),
        "period": period,
        "interval": interval,
        "count": len(records),
        "summary": summary,
        "data": records,
    }


# ---------------------------------------------------------------------------
# 1bis) Fair Value Gaps (FVG) — Smart Money Concepts
# ---------------------------------------------------------------------------
@app.get("/api/analysis/fvg/{ticker}")
def fair_value_gaps(ticker: str, period: str = "3mo", interval: str = "1d") -> dict:
    """Détecte les Fair Value Gaps (FVG) selon la définition Smart Money Concepts.

    Un FVG est une inefficience de prix formée sur 3 bougies consécutives :
      - FVG haussier : le haut de la bougie N-2 est sous le bas de la bougie N
        (high[i-2] < low[i]) → zone [high[i-2], low[i]].
      - FVG baissier : le bas de la bougie N-2 est au-dessus du haut de la bougie N
        (low[i-2] > high[i]) → zone [high[i], low[i-2]].

    On ne garde que les gaps dont la taille dépasse 0,1 % du prix (filtrage du bruit),
    et on marque un FVG comme « rempli » (filled) si une bougie ultérieure est repassée
    à l'intérieur de la zone.
    """
    df = _download_ohlcv(ticker, period=period, interval=interval)
    df = df.dropna(subset=["high", "low"])

    highs = df["high"].to_numpy(dtype=float)
    lows = df["low"].to_numpy(dtype=float)
    closes = df["close"].to_numpy(dtype=float)
    dates = [idx.strftime("%Y-%m-%d %H:%M:%S") for idx in df.index]

    fvgs: list[dict] = []
    n = len(df)
    # Le FVG se forme sur le triplet (i-2, i-1, i) ; on l'indexe sur la bougie i.
    for i in range(2, n):
        price_ref = closes[i] if closes[i] > 0 else (highs[i] + lows[i]) / 2.0
        if price_ref <= 0:
            continue
        min_size = price_ref * 0.001  # seuil : 0,1 % du prix

        # FVG haussier : high[i-2] < low[i]
        if highs[i - 2] < lows[i]:
            bottom = float(highs[i - 2])
            top = float(lows[i])
            if (top - bottom) > min_size:
                # Rempli si une bougie postérieure revient dans la zone.
                filled = bool(np.any(lows[i + 1:] <= top)) if i + 1 < n else False
                fvgs.append(
                    {
                        "type": "bullish",
                        "top": round(top, 6),
                        "bottom": round(bottom, 6),
                        "date": dates[i],
                        "filled": filled,
                    }
                )
        # FVG baissier : low[i-2] > high[i]
        elif lows[i - 2] > highs[i]:
            top = float(lows[i - 2])
            bottom = float(highs[i])
            if (top - bottom) > min_size:
                filled = bool(np.any(highs[i + 1:] >= bottom)) if i + 1 < n else False
                fvgs.append(
                    {
                        "type": "bearish",
                        "top": round(top, 6),
                        "bottom": round(bottom, 6),
                        "date": dates[i],
                        "filled": filled,
                    }
                )

    return {
        "ticker": ticker.upper(),
        "period": period,
        "interval": interval,
        "count": len(fvgs),
        "fvgs": fvgs,
    }


# ---------------------------------------------------------------------------
# 2) Fondamentaux (actions US uniquement)
# ---------------------------------------------------------------------------
@app.get("/api/analysis/fundamentals/{ticker}")
def fundamentals(ticker: str) -> dict:
    """Retourne les principaux ratios fondamentaux via finvizfinance."""
    try:
        from finvizfinance.quote import finvizfinance
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"finvizfinance indisponible : {exc}")

    try:
        stock = finvizfinance(ticker)
        fund = stock.ticker_fundament()
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Fondamentaux introuvables pour « {ticker} » (actions US uniquement). {exc}",
        )

    # Sélection des métriques les plus utiles avec libellés FR.
    wanted = {
        "P/E": "per",
        "Forward P/E": "forward_per",
        "P/B": "pb",
        "EPS (ttm)": "eps",
        "Market Cap": "market_cap",
        "Dividend %": "dividend_yield",
        "Debt/Eq": "debt_equity",
        "ROE": "roe",
        "ROI": "roi",
        "Gross Margin": "gross_margin",
        "Beta": "beta",
        "52W High": "high_52w",
        "52W Low": "low_52w",
        "Short Float": "short_float",
        "Insider Own": "insider_own",
        "Sector": "sector",
        "Industry": "industry",
        "Price": "price",
    }
    result = {}
    for src_key, dst_key in wanted.items():
        result[dst_key] = fund.get(src_key, "-")

    return {
        "ticker": ticker.upper(),
        "company": fund.get("Company", ticker.upper()),
        "sector": fund.get("Sector", "-"),
        "industry": fund.get("Industry", "-"),
        "metrics": result,
    }


# ---------------------------------------------------------------------------
# 3) News + Sentiment
# ---------------------------------------------------------------------------
@app.get("/api/analysis/news/{ticker}")
def news_sentiment(ticker: str) -> dict:
    """Retourne les 10 dernières news avec score de sentiment VADER."""
    try:
        from finvizfinance.quote import finvizfinance
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"finvizfinance indisponible : {exc}")

    try:
        stock = finvizfinance(ticker)
        news_df = stock.ticker_news()
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=f"News introuvables pour « {ticker} » (actions US uniquement). {exc}",
        )

    if news_df is None or news_df.empty:
        return {"ticker": ticker.upper(), "average_score": 0.0, "label": "neutre", "items": []}

    items = []
    scores = []
    for _, row in news_df.head(10).iterrows():
        title = " ".join(str(row.get("Title", "")).split())
        sentiment = _vader.polarity_scores(title)
        compound = sentiment["compound"]
        scores.append(compound)
        items.append(
            {
                "title": title,
                "source": str(row.get("Source", "")),
                "date": str(row.get("Date", "")),
                "link": str(row.get("Link", "")),
                "sentiment_score": round(compound, 4),
                "sentiment_label": _label_from_score(compound),
            }
        )

    avg = float(np.mean(scores)) if scores else 0.0
    return {
        "ticker": ticker.upper(),
        "average_score": round(avg, 4),
        "label": _label_from_score(avg),
        "items": items,
    }


def _label_from_score(score: float) -> str:
    """Traduit un score VADER (compound) en libellé FR."""
    if score >= 0.05:
        return "haussier"
    if score <= -0.05:
        return "baissier"
    return "neutre"


# ---------------------------------------------------------------------------
# 3bis) News + Sentiment via Alpha Vantage (NEWS_SENTIMENT)
# ---------------------------------------------------------------------------
# Cache mémoire simple : { ticker_upper: (timestamp_epoch, payload) }.
_AV_NEWS_CACHE: dict[str, tuple[float, dict]] = {}
_AV_CACHE_TTL = 15 * 60  # 15 minutes


@app.get("/api/analysis/news_av/{ticker}")
def news_alpha_vantage(ticker: str, request: Request) -> dict:
    """Retourne les dernières news + sentiment via l'API Alpha Vantage (NEWS_SENTIMENT).

    Le résultat est mis en cache 15 minutes par ticker pour préserver le quota API.
    
    La clé Alpha Vantage peut être fournie soit :
    - via le header HTTP 'X-Alpha-Vantage-Key' (priorité, configurée dans l'interface)
    - via la variable d'environnement ALPHA_VANTAGE_API_KEY (backend/.env)
    """
    key = ticker.upper()
    now = time.time()

    # Cache hit ?
    cached = _AV_NEWS_CACHE.get(key)
    if cached is not None and (now - cached[0]) < _AV_CACHE_TTL:
        payload = dict(cached[1])
        payload["cached"] = True
        return payload

    api_key = get_alpha_vantage_key(request)
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Clé Alpha Vantage absente : configurez-la via l'interface (🔑 Configurer les APIs) ou dans backend/.env.",
        )

    url = "https://www.alphavantage.co/query"
    params = {
        "function": "NEWS_SENTIMENT",
        "tickers": key,
        "apikey": api_key,
        "limit": 20,
    }
    try:
        resp = requests.get(url, params=params, timeout=20)
        resp.raise_for_status()
        raw = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Échec de l'appel Alpha Vantage : {exc}")

    # Alpha Vantage renvoie un message d'information/erreur au lieu du feed en cas de
    # quota dépassé ou de ticker invalide.
    if "feed" not in raw:
        note = raw.get("Information") or raw.get("Note") or raw.get("Error Message")
        raise HTTPException(
            status_code=502,
            detail=f"Alpha Vantage n'a pas renvoyé d'articles pour « {key} ». {note or raw}",
        )

    feed = raw.get("feed", []) or []
    items = []
    scores = []
    for art in feed[:20]:
        # Sentiment spécifique au ticker demandé.
        ticker_score = None
        ticker_label = None
        for ts in art.get("ticker_sentiment", []) or []:
            if str(ts.get("ticker", "")).upper() == key:
                ticker_score = _clean_float(ts.get("ticker_sentiment_score"))
                ticker_label = ts.get("ticker_sentiment_label")
                break

        overall_score = _clean_float(art.get("overall_sentiment_score"))
        if overall_score is not None:
            scores.append(overall_score)

        items.append(
            {
                "title": art.get("title", ""),
                "url": art.get("url", ""),
                "time_published": art.get("time_published", ""),
                "source": art.get("source", ""),
                "summary": art.get("summary", ""),
                "overall_sentiment_score": overall_score,
                "overall_sentiment_label": art.get("overall_sentiment_label", "Neutral"),
                "ticker_sentiment_score": ticker_score,
                "ticker_sentiment_label": ticker_label,
            }
        )

    avg = float(np.mean(scores)) if scores else 0.0
    payload = {
        "ticker": key,
        "provider": "alphavantage",
        "count": len(items),
        "average_score": round(avg, 4),
        "average_label": _av_label_from_score(avg),
        "items": items,
        "cached": False,
    }

    _AV_NEWS_CACHE[key] = (now, payload)
    return payload


def _av_label_from_score(score: float) -> str:
    """Traduit un score Alpha Vantage en libellé anglais (Bullish/Bearish/Neutral).

    Seuils officiels Alpha Vantage : x <= -0.35 Bearish, -0.35 < x <= -0.15 Somewhat-Bearish,
    -0.15 < x < 0.15 Neutral, 0.15 <= x < 0.35 Somewhat-Bullish, x >= 0.35 Bullish.
    On simplifie ici en trois classes pour l'affichage.
    """
    if score >= 0.15:
        return "Bullish"
    if score <= -0.15:
        return "Bearish"
    return "Neutral"


# ---------------------------------------------------------------------------
# 3ter) News marché global (indépendant du ticker)
# ---------------------------------------------------------------------------
# Cache mémoire simple : { cache_key: (timestamp_epoch, payload) }.
_GLOBAL_NEWS_CACHE: dict[str, tuple[float, dict]] = {}
_GLOBAL_NEWS_TTL = 15 * 60  # 15 minutes

# Topics proposés au frontend pour le filtrage (libellé FR -> topics Alpha Vantage).
NEWS_TOPICS_FR = [
    "Tous",
    "Marchés",
    "Macro",
    "Technologie",
    "Earnings",
    "IPO",
    "Crypto",
    "Forex",
]


def _av_fetch_topics(topics: str, limit: int, api_key: str) -> list[dict]:
    """Appelle Alpha Vantage NEWS_SENTIMENT pour un jeu de topics (sans ticker).

    Lève une exception en cas d'échec ou de quota dépassé (feed absent).
    """
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "NEWS_SENTIMENT",
        "topics": topics,
        "apikey": api_key,
        "limit": limit,
        "sort": "LATEST",
    }
    resp = requests.get(url, params=params, timeout=20)
    resp.raise_for_status()
    raw = resp.json()
    if "feed" not in raw:
        note = raw.get("Information") or raw.get("Note") or raw.get("Error Message")
        raise RuntimeError(note or "Réponse Alpha Vantage sans feed")
    return raw.get("feed", []) or []


def _normalize_av_article(art: dict) -> dict:
    """Transforme un article Alpha Vantage vers le format renvoyé par notre API."""
    tickers = []
    for ts in art.get("ticker_sentiment", []) or []:
        sym = str(ts.get("ticker", "")).strip()
        if sym:
            tickers.append(sym)
    return {
        "title": art.get("title", ""),
        "url": art.get("url", ""),
        "time_published": art.get("time_published", ""),
        "source": art.get("source", ""),
        "summary": art.get("summary", ""),
        "overall_sentiment_score": _clean_float(art.get("overall_sentiment_score")),
        "overall_sentiment_label": art.get("overall_sentiment_label", "Neutral"),
        "tickers_mentioned": tickers[:8],
    }


def _finviz_global_fallback(limit: int) -> list[dict]:
    """Fallback : récupère les dernières headlines globales via finvizfinance."""
    from finvizfinance.news import News

    data = News().get_news()
    df = data.get("news") if isinstance(data, dict) else None
    if df is None or df.empty:
        return []

    items = []
    for _, row in df.head(limit).iterrows():
        title = " ".join(str(row.get("Title", "")).split())
        if not title:
            continue
        compound = _vader.polarity_scores(title)["compound"]
        items.append(
            {
                "title": title,
                "url": str(row.get("Link", "")),
                "time_published": str(row.get("Date", "")),
                "source": str(row.get("Source", "")),
                "summary": "",
                "overall_sentiment_score": round(compound, 4),
                "overall_sentiment_label": _av_label_from_score(compound),
                "tickers_mentioned": [],
            }
        )
    return items


@app.get("/api/news/topics")
def news_topics() -> dict:
    """Retourne la liste des topics disponibles pour le filtrage côté frontend."""
    return {"topics": NEWS_TOPICS_FR}


@app.get("/api/news/global")
def news_global(
    request: Request,
    topics: str = "financial_markets,earnings,economy_macro",
    limit: int = 50,
) -> dict:
    """Retourne les news marché global (indépendantes d'un ticker).

    - Interroge Alpha Vantage NEWS_SENTIMENT sur deux jeux de topics (les topics
      demandés + technology,ipo) pour couvrir marchés + tech/IPO.
    - Fusionne, déduplique par URL, trie par date décroissante.
    - Cache mémoire 15 minutes.
    - Fallback finvizfinance si le quota Alpha Vantage est dépassé.
    
    La clé Alpha Vantage peut être fournie soit :
    - via le header HTTP 'X-Alpha-Vantage-Key' (priorité, configurée dans l'interface)
    - via la variable d'environnement ALPHA_VANTAGE_API_KEY (backend/.env)
    """
    limit = max(1, min(int(limit), 200))
    key = f"{topics}|{limit}"
    now = time.time()

    cached = _GLOBAL_NEWS_CACHE.get(key)
    if cached is not None and (now - cached[0]) < _GLOBAL_NEWS_TTL:
        payload = dict(cached[1])
        payload["cached"] = True
        return payload

    provider = "alphavantage"
    articles: list[dict] = []
    fallback_reason: Optional[str] = None

    api_key = get_alpha_vantage_key(request)
    if api_key:
        try:
            feeds: list[dict] = []
            feeds.extend(_av_fetch_topics(topics, limit, api_key))
            # Second appel pour couvrir tech + IPO.
            try:
                feeds.extend(_av_fetch_topics("technology,ipo", limit, api_key))
            except Exception:
                # Un échec du second appel (souvent quota) ne doit pas tout casser
                # si le premier a réussi.
                pass
            if not feeds:
                raise RuntimeError("Aucun article renvoyé par Alpha Vantage")
            articles = [_normalize_av_article(a) for a in feeds]
        except Exception as exc:
            fallback_reason = str(exc)
            articles = []
    else:
        fallback_reason = "Clé Alpha Vantage absente (configurez-la via l'interface ou backend/.env)"

    if not articles:
        # Fallback finvizfinance (headlines globales + sentiment VADER sur le titre).
        try:
            articles = _finviz_global_fallback(limit)
            provider = "finviz"
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Impossible de récupérer les news globales "
                    f"(Alpha Vantage : {fallback_reason} ; finviz : {exc})."
                ),
            )

    # Déduplication par URL (en conservant le premier vu).
    seen: set[str] = set()
    deduped: list[dict] = []
    for art in articles:
        u = (art.get("url") or "").strip()
        dedup_key = u or art.get("title", "")
        if dedup_key in seen:
            continue
        seen.add(dedup_key)
        deduped.append(art)

    # Tri par date décroissante (time_published Alpha Vantage = "YYYYMMDDTHHMMSS").
    def _sort_key(a: dict) -> str:
        return str(a.get("time_published", ""))

    deduped.sort(key=_sort_key, reverse=True)
    deduped = deduped[:limit]

    scores = [
        a["overall_sentiment_score"]
        for a in deduped
        if a.get("overall_sentiment_score") is not None
    ]
    avg = float(np.mean(scores)) if scores else 0.0

    payload = {
        "provider": provider,
        "topics": topics,
        "count": len(deduped),
        "average_score": round(avg, 4),
        "average_label": _av_label_from_score(avg),
        "items": deduped,
        "cached": False,
    }
    if fallback_reason and provider == "finviz":
        payload["fallback_reason"] = fallback_reason

    _GLOBAL_NEWS_CACHE[key] = (now, payload)
    return payload


# ---------------------------------------------------------------------------
# 4) Backtest
# ---------------------------------------------------------------------------
class BacktestRequest(BaseModel):
    strategy: str = "sma_cross"  # "sma_cross" | "rsi_reversal"
    period: str = "2y"
    cash: float = 10000.0
    commission: float = 0.002


@app.post("/api/analysis/backtest/{ticker}")
def backtest(ticker: str, req: BacktestRequest) -> dict:
    """Exécute un backtest simple et retourne les métriques + equity curve."""
    from backtesting import Backtest, Strategy
    from backtesting.lib import crossover

    df = _download_ohlcv(ticker, period=req.period, interval="1d")

    # backtesting.py exige des colonnes capitalisées : Open/High/Low/Close/Volume.
    data = df.rename(
        columns={
            "open": "Open",
            "high": "High",
            "low": "Low",
            "close": "Close",
            "volume": "Volume",
        }
    )[["Open", "High", "Low", "Close", "Volume"]].dropna()

    if len(data) < 210:
        raise HTTPException(
            status_code=400,
            detail="Historique insuffisant pour ce backtest (au moins ~210 séances requises). "
            "Essayez une période plus longue.",
        )

    def _sma(arr, n):
        return pd.Series(arr).rolling(n).mean()

    def _rsi(arr, n=14):
        s = pd.Series(arr)
        delta = s.diff()
        gain = delta.clip(lower=0).rolling(n).mean()
        loss = (-delta.clip(upper=0)).rolling(n).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    class SmaCross(Strategy):
        n1 = 50
        n2 = 200

        def init(self):
            self.sma1 = self.I(_sma, self.data.Close, self.n1)
            self.sma2 = self.I(_sma, self.data.Close, self.n2)

        def next(self):
            if crossover(self.sma1, self.sma2):
                self.position.close()
                self.buy()
            elif crossover(self.sma2, self.sma1):
                self.position.close()
                self.sell()

    class RsiReversal(Strategy):
        rsi_period = 14
        lower = 30
        upper = 70

        def init(self):
            self.rsi = self.I(_rsi, self.data.Close, self.rsi_period)

        def next(self):
            if self.rsi[-1] < self.lower and not self.position:
                self.buy()
            elif self.rsi[-1] > self.upper and self.position:
                self.position.close()

    strategy_map = {"sma_cross": SmaCross, "rsi_reversal": RsiReversal}
    strat = strategy_map.get(req.strategy)
    if strat is None:
        raise HTTPException(
            status_code=400,
            detail=f"Stratégie inconnue : « {req.strategy} » (attendu : sma_cross ou rsi_reversal).",
        )

    bt = Backtest(
        data,
        strat,
        cash=req.cash,
        commission=req.commission,
        exclusive_orders=True,
    )
    try:
        stats = bt.run()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Échec du backtest : {exc}")

    # Equity curve (sous-échantillonnée pour rester léger).
    equity = stats["_equity_curve"]["Equity"]
    step = max(1, len(equity) // 300)
    equity_curve = [
        {"date": idx.strftime("%Y-%m-%d"), "value": _clean_float(val)}
        for idx, val in equity.iloc[::step].items()
    ]

    return {
        "ticker": ticker.upper(),
        "strategy": req.strategy,
        "period": req.period,
        "return_pct": _clean_float(stats.get("Return [%]")),
        "buy_hold_return_pct": _clean_float(stats.get("Buy & Hold Return [%]")),
        "sharpe_ratio": _clean_float(stats.get("Sharpe Ratio")),
        "max_drawdown_pct": _clean_float(stats.get("Max. Drawdown [%]")),
        "win_rate": _clean_float(stats.get("Win Rate [%]")),
        "n_trades": int(stats.get("# Trades", 0) or 0),
        "equity_curve": equity_curve,
    }


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "MarketMishmash Analysis API"}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
