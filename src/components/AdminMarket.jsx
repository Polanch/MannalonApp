import { useEffect, useState } from 'react'
import '../assets/styles/admin.css'
import { MarketBarList, PriceTrendChart } from './MarketCharts.jsx'
import {
    COMMODITIES,
    CONDITIONS,
    SEASON_TYPES,
    fetchLeaderboard,
    fetchMarketPrices,
    fetchPriceBreakdown,
    fetchPriceTrend,
    fetchProductivityByArea,
    formatKg,
    formatNumber,
    formatPeso,
    formatTonsPerHa,
    labelOf,
    median,
    toNumber,
} from '../services/marketApi.js'

const TABS = [
    { key: 'prices', label: 'Market Prices' },
    { key: 'breakdown', label: 'Why Prices Differ' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'productivity', label: 'Productivity by Area' },
]

const BREAKDOWNS = [
    { by: 'condition', title: 'By condition', hint: 'Dried vs fresh (wet) palay' },
    { by: 'buyerType', title: 'By buyer', hint: 'Who the Farmers sold to' },
    { by: 'variety', title: 'By variety', hint: 'Seed variety planted' },
    { by: 'barangay', title: 'By barangay', hint: 'Where the sale happened' },
]

const SORT_OPTIONS = [
    { value: 'yield', label: 'Highest yield (t/ha)' },
    { value: 'netIncomePerHa', label: 'Highest net income per ha' },
    { value: 'costPerKg', label: 'Lowest cost per kg' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

function useMarketQuery(loader, params) {
    const requestKey = JSON.stringify(params)
    const [state, setState] = useState({ key: '', data: null, error: '' })

    useEffect(() => {
        let isActive = true
        loader(JSON.parse(requestKey))
            .then((data) => { if (isActive) setState({ key: requestKey, data, error: '' }) })
            .catch((requestError) => { if (isActive) setState({ key: requestKey, data: null, error: requestError.message || 'Unable to load market data.' }) })
        return () => { isActive = false }
    }, [loader, requestKey])

    const isLoading = state.key !== requestKey
    return { data: isLoading ? null : state.data, error: isLoading ? '' : state.error, isLoading }
}

function loadPricesAndTrend({ commodity, days, municipality, condition }) {
    return Promise.all([
        fetchMarketPrices({ commodity, days, municipality, condition }),
        fetchPriceTrend({ commodity, condition, weeks: 12 }),
    ]).then(([prices, trend]) => ({ prices, trend }))
}

function loadBreakdowns({ commodity, days }) {
    return Promise.all(BREAKDOWNS.map(({ by }) => fetchPriceBreakdown({ commodity, days, by })))
        .then((results) => Object.fromEntries(BREAKDOWNS.map(({ by }, index) => [by, results[index]])))
}

function Kpi({ label, value, hint, tone }) {
    return (
        <div className={`market-kpi${tone ? ` is-${tone}` : ''}`}>
            <small>{label}</small>
            <strong>{value}</strong>
            {hint && <span>{hint}</span>}
        </div>
    )
}

function PricesTab({ commodity }) {
    const [filters, setFilters] = useState({ days: '30', condition: 'DRY', municipality: '' })
    const [municipalityInput, setMunicipalityInput] = useState('')
    const { data, error, isLoading } = useMarketQuery(loadPricesAndTrend, { commodity, ...filters })
    const prices = data?.prices || []
    const trend = data?.trend || []
    const overall = median(prices.map((row) => row.medianPricePerKg))
    const reports = prices.reduce((sum, row) => sum + Number(row.reportCount || 0), 0)
    const trendValues = trend.map((point) => toNumber(point.medianPricePerKg)).filter((value) => value !== null)
    const change = trendValues.length >= 2 ? trendValues[trendValues.length - 1] - trendValues[trendValues.length - 2] : null
    const sorted = [...prices].sort((a, b) => Number(b.medianPricePerKg) - Number(a.medianPricePerKg))

    return (
        <>
            <div className="market-toolbar">
                <label><span>Condition</span>
                    <select value={filters.condition} onChange={(event) => setFilters({ ...filters, condition: event.target.value })}>
                        <option value="">All</option>
                        {CONDITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                <label><span>Period</span>
                    <select value={filters.days} onChange={(event) => setFilters({ ...filters, days: event.target.value })}>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="365">Last 12 months</option>
                    </select>
                </label>
                <form className="market-toolbar-search" onSubmit={(event) => { event.preventDefault(); setFilters({ ...filters, municipality: municipalityInput.trim() }) }}>
                    <label><span>Municipality</span><input value={municipalityInput} onChange={(event) => setMunicipalityInput(event.target.value)} placeholder="All municipalities" /></label>
                    <button type="submit" className="admin-button admin-button-secondary">Apply</button>
                </form>
            </div>

            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}

            <div className="market-kpis">
                <Kpi label="Typical farmgate price" value={overall !== null ? `${formatPeso(overall)}/kg` : '-'} hint="Median across areas" tone="primary" />
                <Kpi
                    label="Week-over-week"
                    value={change === null ? '-' : `${change >= 0 ? '▲' : '▼'} ${formatPeso(Math.abs(change))}`}
                    hint="Change in weekly median"
                    tone={change === null ? '' : change >= 0 ? 'up' : 'down'}
                />
                <Kpi label="Highest area" value={sorted[0] ? formatPeso(sorted[0].medianPricePerKg) : '-'} hint={sorted[0]?.municipality || ''} />
                <Kpi label="Sales reports" value={formatNumber(reports, 0)} hint="Approved FarmTE sales" />
            </div>

            <section className="admin-panel market-panel">
                <div className="market-panel-head">
                    <h3>12-week price trend</h3>
                    <p>Weekly median price per kilo for {labelOf(commodity).toLowerCase()}{filters.condition ? `, ${labelOf(filters.condition).toLowerCase()}` : ''}.</p>
                </div>
                {isLoading ? <p className="admin-loading">Loading trend...</p> : <PriceTrendChart points={trend} />}
            </section>

            <section className="admin-panel market-panel">
                <div className="market-panel-head">
                    <h3>Price board</h3>
                    <p>This is what Farmers see on their Market Prices page. Groups with fewer than 3 sales are hidden.</p>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-data-table">
                        <thead><tr><th>Municipality</th><th>Variety</th><th>Condition</th><th>Median / kg</th><th>Min</th><th>Max</th><th>Reports</th><th>Latest sale</th></tr></thead>
                        <tbody>
                            {sorted.map((row) => (
                                <tr key={`${row.municipality}-${row.variety}-${row.condition}`}>
                                    <td>{row.municipality || '-'}</td>
                                    <td>{row.variety || 'Any'}</td>
                                    <td>{labelOf(row.condition)}</td>
                                    <td><strong>{formatPeso(row.medianPricePerKg)}</strong></td>
                                    <td>{formatPeso(row.minPrice)}</td>
                                    <td>{formatPeso(row.maxPrice)}</td>
                                    <td>{row.reportCount}</td>
                                    <td>{row.latestSaleDate ? new Date(row.latestSaleDate).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                            {!sorted.length && <tr><td className="admin-table-empty" colSpan="8">{isLoading ? 'Loading prices...' : 'Not enough approved sales reports for these filters yet.'}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    )
}

function breakdownInsight(rows, by) {
    const data = (rows || []).filter((row) => toNumber(row.medianPricePerKg) !== null)
    if (data.length < 2) return null
    const sorted = [...data].sort((a, b) => Number(b.medianPricePerKg) - Number(a.medianPricePerKg))
    const top = sorted[0]
    const bottom = sorted[sorted.length - 1]
    const gap = Number(top.medianPricePerKg) - Number(bottom.medianPricePerKg)
    const name = (key) => (by === 'condition' || by === 'buyerType' ? labelOf(key) : key || 'Unspecified')
    return `${name(top.key)} gets ${formatPeso(gap)}/kg more than ${name(bottom.key)}.`
}

function BreakdownTab({ commodity }) {
    const [days, setDays] = useState('30')
    const { data, error, isLoading } = useMarketQuery(loadBreakdowns, { commodity, days })

    return (
        <>
            <div className="market-toolbar">
                <label><span>Period</span>
                    <select value={days} onChange={(event) => setDays(event.target.value)}>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="365">Last 12 months</option>
                    </select>
                </label>
                <p className="market-toolbar-note">Each panel compares the median price per kilo across one factor, so you can see what drives price differences.</p>
            </div>
            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
            <div className="market-breakdown-grid">
                {BREAKDOWNS.map(({ by, title, hint }) => {
                    const rows = data?.[by] || []
                    const insight = breakdownInsight(rows, by)
                    return (
                        <section key={by} className="admin-panel market-panel">
                            <div className="market-panel-head">
                                <h3>{title}</h3>
                                <p>{hint}</p>
                            </div>
                            {isLoading ? <p className="admin-loading">Loading...</p> : (
                                <>
                                    <MarketBarList
                                        caption={title}
                                        rows={[...rows]
                                            .sort((a, b) => Number(b.medianPricePerKg) - Number(a.medianPricePerKg))
                                            .map((row) => ({ key: row.key, value: row.medianPricePerKg, meta: `${row.reportCount} reports` }))}
                                        labelFor={(key) => (by === 'condition' || by === 'buyerType' ? labelOf(key) : key || 'Unspecified')}
                                        formatValue={(value) => `${formatPeso(value)}/kg`}
                                    />
                                    {insight && <p className="market-insight">💡 {insight}</p>}
                                </>
                            )}
                        </section>
                    )
                })}
            </div>
        </>
    )
}

function LeaderboardTab({ commodity }) {
    const [filters, setFilters] = useState({ seasonType: '', year: String(CURRENT_YEAR), sortBy: 'yield' })
    const { data, error, isLoading } = useMarketQuery(fetchLeaderboard, { commodity, limit: 20, ...filters })
    const rows = data || []
    const podium = rows.slice(0, 3)

    return (
        <>
            <div className="market-toolbar">
                <label><span>Season</span>
                    <select value={filters.seasonType} onChange={(event) => setFilters({ ...filters, seasonType: event.target.value })}>
                        <option value="">Both seasons</option>
                        {SEASON_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                <label><span>Year</span>
                    <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
                        {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                </label>
                <label><span>Rank by</span>
                    <select value={filters.sortBy} onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}>
                        {SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
            </div>
            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}

            {podium.length > 0 && (
                <div className="market-podium">
                    {podium.map((row, index) => (
                        <article key={row.farmId} className={`market-podium-card place-${index + 1}`}>
                            <span className="market-podium-rank">{['🥇', '🥈', '🥉'][index]}</span>
                            <h3>{row.farmName || row.farmCode}</h3>
                            <p>{[row.barangay, row.municipality].filter(Boolean).join(', ') || '-'}</p>
                            <strong>
                                {filters.sortBy === 'netIncomePerHa' ? formatPeso(row.netIncomePerHa)
                                    : filters.sortBy === 'costPerKg' ? `${formatPeso(row.costPerKg)}/kg`
                                    : formatTonsPerHa(row.yieldTonsPerHa)}
                            </strong>
                            <small>{SORT_OPTIONS.find((item) => item.value === filters.sortBy)?.label}</small>
                        </article>
                    ))}
                </div>
            )}

            <section className="admin-panel market-panel">
                <div className="market-panel-head">
                    <h3>Farm leaderboard</h3>
                    <p>Ranked per hectare so small and large farms compare fairly. Only data from approved FarmTE reports is counted.</p>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-data-table">
                        <thead>
                            <tr><th>#</th><th>Farm</th><th>Location</th><th>Area</th><th>Harvest</th><th>Yield</th><th>Avg price</th><th>Net income / ha</th><th>Cost / kg</th><th>Farmers</th></tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.farmId}>
                                    <td><span className="market-rank">{row.rank}</span></td>
                                    <td><strong>{row.farmName || '-'}</strong><br /><small className="market-muted">{row.farmCode}</small></td>
                                    <td>{[row.barangay, row.municipality].filter(Boolean).join(', ') || '-'}</td>
                                    <td>{formatNumber(row.totalAreaHa)} ha</td>
                                    <td>{formatKg(row.totalHarvestKg)}</td>
                                    <td className={filters.sortBy === 'yield' ? 'market-sorted' : ''}>{formatTonsPerHa(row.yieldTonsPerHa)}</td>
                                    <td>{row.averagePricePerKg ? `${formatPeso(row.averagePricePerKg)}/kg` : '-'}</td>
                                    <td className={filters.sortBy === 'netIncomePerHa' ? 'market-sorted' : ''}>{formatPeso(row.netIncomePerHa)}</td>
                                    <td className={filters.sortBy === 'costPerKg' ? 'market-sorted' : ''}>{row.costPerKg ? `${formatPeso(row.costPerKg)}/kg` : '-'}</td>
                                    <td>{row.farmerCount}</td>
                                </tr>
                            ))}
                            {!rows.length && <tr><td className="admin-table-empty" colSpan="10">{isLoading ? 'Loading leaderboard...' : 'No farms with approved harvest data for this season yet.'}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    )
}

function ProductivityTab({ commodity }) {
    const [filters, setFilters] = useState({ seasonType: '', year: String(CURRENT_YEAR) })
    const { data, error, isLoading } = useMarketQuery(fetchProductivityByArea, { commodity, ...filters })
    const rows = [...(data || [])].sort((a, b) => Number(b.averageYieldTonsPerHa) - Number(a.averageYieldTonsPerHa))
    const totalHarvest = rows.reduce((sum, row) => sum + Number(row.totalHarvestKg || 0), 0)
    const areaAverage = rows.length ? rows.reduce((sum, row) => sum + Number(row.averageYieldTonsPerHa || 0), 0) / rows.length : null

    return (
        <>
            <div className="market-toolbar">
                <label><span>Season</span>
                    <select value={filters.seasonType} onChange={(event) => setFilters({ ...filters, seasonType: event.target.value })}>
                        <option value="">Both seasons</option>
                        {SEASON_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                <label><span>Year</span>
                    <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
                        {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                </label>
            </div>
            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}

            <div className="market-kpis">
                <Kpi label="Average yield" value={formatTonsPerHa(areaAverage)} hint="Across reporting barangays" tone="primary" />
                <Kpi label="Most productive" value={rows[0]?.barangay || '-'} hint={rows[0] ? formatTonsPerHa(rows[0].averageYieldTonsPerHa) : ''} tone="up" />
                <Kpi label="Least productive" value={rows.length > 1 ? rows[rows.length - 1].barangay : '-'} hint={rows.length > 1 ? formatTonsPerHa(rows[rows.length - 1].averageYieldTonsPerHa) : ''} tone="down" />
                <Kpi label="Total harvest" value={formatKg(totalHarvest)} hint={`${rows.reduce((sum, row) => sum + Number(row.farmCount || 0), 0)} farms`} />
            </div>

            <div className="market-breakdown-grid">
                <section className="admin-panel market-panel">
                    <div className="market-panel-head">
                        <h3>Yield by barangay</h3>
                        <p>Tons of harvest per hectare planted.</p>
                    </div>
                    {isLoading ? <p className="admin-loading">Loading...</p> : (
                        <MarketBarList
                            caption="Yield by barangay"
                            rows={rows.map((row) => ({ key: row.barangay, value: row.averageYieldTonsPerHa, meta: `${row.farmCount} farms` }))}
                            formatValue={(value) => formatTonsPerHa(value)}
                        />
                    )}
                </section>
                <section className="admin-panel market-panel">
                    <div className="market-panel-head">
                        <h3>Area details</h3>
                        <p>Barangays below the average may need support programs (seeds, fertilizer, irrigation).</p>
                    </div>
                    <div className="admin-table-wrap">
                        <table className="admin-data-table">
                            <thead><tr><th>Barangay</th><th>Yield</th><th>Median price</th><th>Harvest</th><th>Farms</th><th>Status</th></tr></thead>
                            <tbody>
                                {rows.map((row) => {
                                    const isAbove = areaAverage !== null && Number(row.averageYieldTonsPerHa) >= areaAverage
                                    return (
                                        <tr key={row.barangay}>
                                            <td>{row.barangay || '-'}</td>
                                            <td><strong>{formatTonsPerHa(row.averageYieldTonsPerHa)}</strong></td>
                                            <td>{row.medianPricePerKg ? `${formatPeso(row.medianPricePerKg)}/kg` : '-'}</td>
                                            <td>{formatKg(row.totalHarvestKg)}</td>
                                            <td>{row.farmCount}</td>
                                            <td><span className={`market-tag ${isAbove ? 'is-up' : 'is-down'}`}>{isAbove ? 'Above average' : 'Needs support'}</span></td>
                                        </tr>
                                    )
                                })}
                                {!rows.length && <tr><td className="admin-table-empty" colSpan="6">{isLoading ? 'Loading...' : 'No approved harvest data for this season yet.'}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </>
    )
}

function AdminMarket() {
    const [activeTab, setActiveTab] = useState('prices')
    const [commodity, setCommodity] = useState('RICE')

    return (
        <section className="admin-fo-page market-page">
            <div className="admin-fo-header">
                <div>
                    <p className="admin-eyebrow">MARKET INSIGHTS</p>
                    <h2>Market Prices &amp; Farm Performance</h2>
                    <p className="admin-section-description">Built from harvest and sales records Farmers submit in FarmTE, counted only after their Farm-Admin approves the report.</p>
                </div>
                <div className="admin-fo-controls">
                    <label>
                        <span>Crop</span>
                        <select value={commodity} onChange={(event) => setCommodity(event.target.value)}>
                            {COMMODITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            <div className="market-tabs" role="tablist">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        className={activeTab === tab.key ? 'is-active' : ''}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'prices' && <PricesTab commodity={commodity} />}
            {activeTab === 'breakdown' && <BreakdownTab commodity={commodity} />}
            {activeTab === 'leaderboard' && <LeaderboardTab commodity={commodity} />}
            {activeTab === 'productivity' && <ProductivityTab commodity={commodity} />}
        </section>
    )
}

export default AdminMarket
