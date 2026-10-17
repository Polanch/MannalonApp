const API_ORIGIN = 'http://localhost:8080'

export const COMMODITIES = [
    { value: 'RICE', label: 'Rice (palay)' },
    { value: 'CORN', label: 'Corn' },
    { value: 'VEGETABLE', label: 'Vegetables' },
]

export const CONDITIONS = [
    { value: 'DRY', label: 'Dried' },
    { value: 'FRESH', label: 'Fresh (wet)' },
]

export const BUYER_TYPES = [
    { value: 'TRADER', label: 'Trader' },
    { value: 'NFA', label: 'NFA' },
    { value: 'COOPERATIVE', label: 'Cooperative' },
    { value: 'MILLER', label: 'Miller' },
    { value: 'OTHER', label: 'Other' },
]

export const SEASON_TYPES = [
    { value: 'WET', label: 'Wet season (May-Oct)' },
    { value: 'DRY', label: 'Dry season (Nov-Apr)' },
]

const LABELS = Object.fromEntries(
    [...COMMODITIES, ...CONDITIONS, ...BUYER_TYPES, ...SEASON_TYPES, { value: 'IRRIGATED', label: 'Irrigated' }, { value: 'RAINFED', label: 'Rainfed' }]
        .map(({ value, label }) => [value, label]),
)

export function labelOf(value) {
    if (value === null || value === undefined || value === '') return '-'
    return LABELS[String(value).toUpperCase()] || String(value)
}

export function seasonLabel(season) {
    const year = (season.plantingDate || season.createdAt || '').slice(0, 4)
    return `${labelOf(season.commodity)} · ${season.seasonType === 'DRY' ? 'Dry' : 'Wet'} ${year}${season.variety ? ` · ${season.variety}` : ''}`
}

export function toNumber(value) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

export function formatPeso(value, digits = 2) {
    const number = toNumber(value)
    if (number === null) return '-'
    return `₱${number.toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function formatNumber(value, digits = 2) {
    const number = toNumber(value)
    if (number === null) return '-'
    return number.toLocaleString('en-PH', { maximumFractionDigits: digits })
}

export function formatKg(value) {
    const number = toNumber(value)
    return number === null ? '-' : `${formatNumber(number, 1)} kg`
}

export function formatTonsPerHa(value) {
    const number = toNumber(value)
    return number === null ? '-' : `${formatNumber(number, 2)} t/ha`
}

async function getJson(path, params) {
    const url = new URL(path, API_ORIGIN)
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
    })
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.message || `Request failed (${response.status}).`)
    }
    const data = await response.json()
    return Array.isArray(data) ? data : []
}

export function fetchMarketPrices({ commodity, days, municipality, condition }) {
    return getJson('/api/market/prices', { commodity, days, municipality, condition })
}

export function fetchPriceTrend({ commodity, condition, weeks }) {
    return getJson('/api/market/prices/trend', { commodity, condition, weeks })
}

export function fetchPriceBreakdown({ commodity, days, by }) {
    return getJson('/api/admin/market/price-breakdown', { commodity, days, by })
}

export function fetchLeaderboard({ seasonType, year, commodity, sortBy, limit }) {
    return getJson('/api/admin/market/leaderboard', { seasonType, year, commodity, sortBy, limit })
}

export function fetchProductivityByArea({ seasonType, year, commodity }) {
    return getJson('/api/admin/market/productivity-by-area', { seasonType, year, commodity })
}

export function median(values) {
    const sorted = values.map(toNumber).filter((value) => value !== null).sort((a, b) => a - b)
    if (!sorted.length) return null
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
