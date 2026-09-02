"""
MarketMishmash — Micro-backend d'analyse (Phase 1)
===================================================

API FastAPI fournissant l'analyse des valeurs (actions et crypto) au frontend :
  - Analyse technique (pandas-ta-classic) : RSI, MACD, Bollinger, EMA, ATR...
  - Fondamentaux (finvizfinance) : ratios financiers des actions US
  - News + sentiment (finvizfinance + VADER)
  - Backtest de stratégies simples (backtesting.py)

Lancement :  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import math
from typing import Any, Optional

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Indicateurs techniques -------------------------------------------------
import pandas_ta_classic as ta  # pandas-ta-classic s'importe sous "pandas_ta_classic"

# --- Sentiment --------------------------------------------------------------
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

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
