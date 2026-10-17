import '../assets/styles/market.css'
import { formatPeso, toNumber } from '../services/marketApi.js'

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 16, right: 16, bottom: 32, left: 56 }

function formatWeek(value) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export function PriceTrendChart({ points }) {
    const data = (points || [])
        .map((point) => ({ week: point.week, value: toNumber(point.medianPricePerKg) }))
        .filter((point) => point.value !== null)

    if (data.length < 2) {
        return <p className="market-empty">Not enough weekly price reports yet to draw a trend.</p>
    }

    const values = data.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = max - min || 1
    const low = Math.max(0, min - spread * 0.15)
    const high = max + spread * 0.15
    const innerWidth = WIDTH - PAD.left - PAD.right
    const innerHeight = HEIGHT - PAD.top - PAD.bottom
    const x = (index) => PAD.left + (index / (data.length - 1)) * innerWidth
    const y = (value) => PAD.top + (1 - (value - low) / (high - low)) * innerHeight
    const path = data.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')
    const area = `${path} L${x(data.length - 1).toFixed(1)},${PAD.top + innerHeight} L${PAD.left},${PAD.top + innerHeight} Z`
    const ticks = [0, 0.5, 1].map((ratio) => low + (high - low) * ratio)
    const labelEvery = Math.ceil(data.length / 6)

    return (
        <svg className="market-trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Weekly median price per kilo">
            {ticks.map((tick) => (
                <g key={tick}>
                    <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} className="market-trend-grid" />
                    <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="market-trend-axis">{formatPeso(tick, 0)}</text>
                </g>
            ))}
            <path d={area} className="market-trend-area" />
            <path d={path} className="market-trend-line" />
            {data.map((point, index) => (
                <g key={point.week}>
                    <circle cx={x(index)} cy={y(point.value)} r="4" className="market-trend-dot">
                        <title>{`${formatWeek(point.week)}: ${formatPeso(point.value)}/kg`}</title>
                    </circle>
                    {index % labelEvery === 0 && (
                        <text x={x(index)} y={HEIGHT - 10} textAnchor="middle" className="market-trend-axis">{formatWeek(point.week)}</text>
                    )}
                </g>
            ))}
        </svg>
    )
}

export function MarketBarList({ rows, formatValue = (value) => formatPeso(value), labelFor = (key) => key, caption }) {
    const data = (rows || []).map((row) => ({ ...row, numeric: toNumber(row.value) })).filter((row) => row.numeric !== null)
    if (!data.length) return <p className="market-empty">No approved reports for this view yet.</p>
    const max = Math.max(...data.map((row) => row.numeric)) || 1

    return (
        <ul className="market-bars" aria-label={caption}>
            {data.map((row) => (
                <li key={row.key}>
                    <span className="market-bar-label">{labelFor(row.key)}</span>
                    <span className="market-bar-track">
                        <span className="market-bar-fill" style={{ width: `${Math.max(4, (row.numeric / max) * 100)}%` }} />
                    </span>
                    <span className="market-bar-value">{formatValue(row.numeric)}</span>
                    {row.meta && <span className="market-bar-meta">{row.meta}</span>}
                </li>
            ))}
        </ul>
    )
}
