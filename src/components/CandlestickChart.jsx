// CandlestickChart — graphique pro type TradingView (lightweight-charts v5).
//
// Structure : 3 panneaux empilés et synchronisés en temps :
//   1. Chandeliers OHLC + EMA 20/50/200 + Bandes de Bollinger + zones FVG (primitive)
//   2. RSI (14) avec lignes 30/70
//   3. MACD : histogramme + ligne MACD + ligne signal
//
// - Thème sombre (#131722) façon TradingView.
// - Crosshair et plage temporelle synchronisés entre les 3 panneaux.
// - Responsive via ResizeObserver ; nettoyage complet au démontage.

import { useEffect, useRef } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts'

// --- Primitive FVG : dessine les zones Fair Value Gap en rectangles ----------
// Rectangle du jour du gap jusqu'au bord droit du graphique.
class FVGRenderer {
  constructor(source) {
    this._source = source
  }

  draw(target) {
    const src = this._source
    const chart = src._chart
    const series = src._series
    if (!chart || !series || !src._fvgs.length) return
    const timeScale = chart.timeScale()

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context
      const width = scope.mediaSize.width
      for (const fvg of src._fvgs) {
        const x1 = timeScale.timeToCoordinate(fvg.time)
        if (x1 === null) continue
        const yTop = series.priceToCoordinate(fvg.top)
        const yBot = series.priceToCoordinate(fvg.bottom)
        if (yTop === null || yBot === null) continue

        const left = Math.max(0, x1)
        const rectWidth = Math.max(1, width - left)
        const top = Math.min(yTop, yBot)
        const height = Math.max(1, Math.abs(yBot - yTop))

        // Vert = haussier, rouge = baissier. Opacité réduite si déjà rempli.
        const bullish = fvg.type === 'bullish'
        const fillAlpha = fvg.filled ? 0.08 : 0.22
        const borderAlpha = fvg.filled ? 0.25 : 0.55
        const rgb = bullish ? '38, 166, 154' : '239, 83, 80'

        ctx.fillStyle = `rgba(${rgb}, ${fillAlpha})`
        ctx.fillRect(left, top, rectWidth, height)

        ctx.strokeStyle = `rgba(${rgb}, ${borderAlpha})`
        ctx.lineWidth = 1
        ctx.strokeRect(left, top, rectWidth, height)
      }
    })
  }
}

class FVGPaneView {
  constructor(source) {
    this._source = source
    this._renderer = new FVGRenderer(source)
  }

  update() {}

  renderer() {
    return this._renderer
  }

  // Dessiné sous les chandeliers pour ne pas masquer le prix.
  zOrder() {
    return 'bottom'
  }
}

class FVGPrimitive {
  constructor() {
    this._fvgs = []
    this._chart = null
    this._series = null
    this._paneViews = [new FVGPaneView(this)]
    this._requestUpdate = null
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart
    this._series = series
    this._requestUpdate = requestUpdate
  }

  detached() {
    this._chart = null
    this._series = null
    this._requestUpdate = null
  }

  setData(fvgs) {
    this._fvgs = fvgs || []
    if (this._requestUpdate) this._requestUpdate()
  }

  updateAllViews() {}

  paneViews() {
    return this._paneViews
  }
}

// --- Utilitaires de transformation des données -------------------------------
// Les dates du backend sont « YYYY-MM-DD HH:MM:SS » ; on garde la partie date
// (interval journalier) au format attendu par lightweight-charts.
function toTime(dateStr) {
  return String(dateStr).split(' ')[0]
}

function lineData(rows, field) {
  const out = []
  for (const r of rows) {
    const v = r[field]
    if (v === null || v === undefined || Number.isNaN(v)) continue
    out.push({ time: toTime(r.date), value: v })
  }
  return out
}

const CHART_BG = '#131722'
const TEXT_COLOR = '#d1d4dc'
const GRID_COLOR = 'rgba(70, 76, 90, 0.35)'
const BORDER_COLOR = 'rgba(70, 76, 90, 0.8)'

function baseChartOptions(height) {
  return {
    height,
    layout: {
      background: { type: ColorType.Solid, color: CHART_BG },
      textColor: TEXT_COLOR,
      fontSize: 11,
    },
    grid: {
      vertLines: { color: GRID_COLOR },
      horzLines: { color: GRID_COLOR },
    },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: BORDER_COLOR },
    timeScale: { borderColor: BORDER_COLOR, timeVisible: false, rightOffset: 5 },
  }
}

export default function CandlestickChart({ rows, fvgs }) {
  const mainRef = useRef(null)
  const rsiRef = useRef(null)
  const macdRef = useRef(null)

  useEffect(() => {
    if (!rows || rows.length === 0) return
    if (!mainRef.current || !rsiRef.current || !macdRef.current) return

    // --- Création des 3 graphiques ---
    const mainChart = createChart(mainRef.current, {
      ...baseChartOptions(320),
      width: mainRef.current.clientWidth,
    })
    const rsiChart = createChart(rsiRef.current, {
      ...baseChartOptions(130),
      width: rsiRef.current.clientWidth,
    })
    const macdChart = createChart(macdRef.current, {
      ...baseChartOptions(150),
      width: macdRef.current.clientWidth,
    })

    const charts = [mainChart, rsiChart, macdChart]

    // --- Panneau 1 : chandeliers + EMA + Bollinger ---
    const candle = mainChart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })
    const candleData = rows
      .filter(
        (r) =>
          r.open !== null &&
          r.high !== null &&
          r.low !== null &&
          r.close !== null,
      )
      .map((r) => ({
        time: toTime(r.date),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
      }))
    candle.setData(candleData)

    const overlayLine = (color, field, dashed = false) => {
      const s = mainChart.addSeries(LineSeries, {
        color,
        lineWidth: dashed ? 1 : 2,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      s.setData(lineData(rows, field))
      return s
    }

    overlayLine('#ef5350', 'ema_20') // EMA 20 rouge
    overlayLine('#2962ff', 'ema_50') // EMA 50 bleu
    overlayLine('#b2b5be', 'ema_200') // EMA 200 gris clair
    overlayLine('rgba(150,150,150,0.9)', 'bb_upper', true) // Bollinger haute
    overlayLine('rgba(150,150,150,0.9)', 'bb_lower', true) // Bollinger basse

    // --- Primitive FVG attachée aux chandeliers ---
    const fvgPrimitive = new FVGPrimitive()
    candle.attachPrimitive(fvgPrimitive)
    if (fvgs && fvgs.length) {
      fvgPrimitive.setData(
        fvgs.map((f) => ({
          time: toTime(f.date),
          top: f.top,
          bottom: f.bottom,
          type: f.type,
          filled: f.filled,
        })),
      )
    }

    // --- Panneau 2 : RSI + lignes 30/70 ---
    const rsi = rsiChart.addSeries(LineSeries, {
      color: '#c792ea',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    })
    rsi.setData(lineData(rows, 'rsi_14'))
    rsi.createPriceLine({
      price: 70,
      color: 'rgba(239,83,80,0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '70',
    })
    rsi.createPriceLine({
      price: 30,
      color: 'rgba(38,166,154,0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '30',
    })

    // --- Panneau 3 : MACD (histogramme + MACD + signal) ---
    const macdHist = macdChart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    })
    macdHist.setData(
      rows
        .filter((r) => r.macd_hist !== null && r.macd_hist !== undefined)
        .map((r) => ({
          time: toTime(r.date),
          value: r.macd_hist,
          color:
            r.macd_hist >= 0 ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)',
        })),
    )
    const macdLine = macdChart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    macdLine.setData(lineData(rows, 'macd'))
    const signalLine = macdChart.addSeries(LineSeries, {
      color: '#ff6d00',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    signalLine.setData(lineData(rows, 'macd_signal'))

    charts.forEach((c) => c.timeScale().fitContent())

    // --- Synchronisation de la plage temporelle ---
    let syncing = false
    const syncRange = (source) => (range) => {
      if (syncing || !range) return
      syncing = true
      charts.forEach((c) => {
        if (c !== source) c.timeScale().setVisibleLogicalRange(range)
      })
      syncing = false
    }
    charts.forEach((c) =>
      c.timeScale().subscribeVisibleLogicalRangeChange(syncRange(c)),
    )

    // --- Synchronisation du crosshair ---
    let crossSyncing = false
    const seriesByChart = new Map([
      [mainChart, candle],
      [rsiChart, rsi],
      [macdChart, macdLine],
    ])
    const crossHandler = (source) => (param) => {
      if (crossSyncing) return
      crossSyncing = true
      charts.forEach((c) => {
        if (c === source) return
        const s = seriesByChart.get(c)
        if (param.time !== undefined && param.time !== null) {
          c.setCrosshairPosition(0, param.time, s)
        } else {
          c.clearCrosshairPosition()
        }
      })
      crossSyncing = false
    }
    charts.forEach((c) => c.subscribeCrosshairMove(crossHandler(c)))

    // --- Responsive ---
    const ro = new ResizeObserver(() => {
      if (mainRef.current) mainChart.applyOptions({ width: mainRef.current.clientWidth })
      if (rsiRef.current) rsiChart.applyOptions({ width: rsiRef.current.clientWidth })
      if (macdRef.current) macdChart.applyOptions({ width: macdRef.current.clientWidth })
    })
    if (mainRef.current) ro.observe(mainRef.current)

    // --- Nettoyage ---
    return () => {
      ro.disconnect()
      charts.forEach((c) => c.remove())
    }
  }, [rows, fvgs])

  return (
    <div className="space-y-1">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4" style={{ background: '#ef5350' }} /> EMA 20
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4" style={{ background: '#2962ff' }} /> EMA 50
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4" style={{ background: '#b2b5be' }} /> EMA 200
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4" style={{ background: 'rgba(38,166,154,0.4)' }} /> FVG haussier
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4" style={{ background: 'rgba(239,83,80,0.4)' }} /> FVG baissier
          </span>
        </div>
        <div ref={mainRef} className="w-full" />
      </div>
      <div>
        <div className="mb-1 text-xs text-gray-400">RSI (14)</div>
        <div ref={rsiRef} className="w-full" />
      </div>
      <div>
        <div className="mb-1 text-xs text-gray-400">MACD (12, 26, 9)</div>
        <div ref={macdRef} className="w-full" />
      </div>
    </div>
  )
}
