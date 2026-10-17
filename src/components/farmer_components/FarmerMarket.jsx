import { useEffect, useState } from 'react'
import { PriceTrendChart } from '../MarketCharts.jsx'
import {
    COMMODITIES,
    CONDITIONS,
    fetchMarketPrices,
    fetchPriceTrend,
    formatPeso,
    labelOf,
    median,
} from '../../services/marketApi.js'

function FarmerMarket({ cardView = false }) {
    const [filters, setFilters] = useState({ commodity: 'RICE', condition: 'DRY', days: '30' })
    const [result, setResult] = useState({ key: '', prices: [], trend: [], error: '' })
    const requestKey = JSON.stringify(filters)

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                const [prices, trend] = await Promise.all([
                    fetchMarketPrices({ commodity: filters.commodity, days: filters.days, condition: filters.condition }),
                    fetchPriceTrend({ commodity: filters.commodity, condition: filters.condition, weeks: 12 }),
                ])
                if (isActive) setResult({ key: requestKey, prices, trend, error: '' })
            } catch (requestError) {
                if (isActive) setResult({ key: requestKey, prices: [], trend: [], error: requestError.message })
            }
        }

        load()
        return () => { isActive = false }
    }, [filters, requestKey])

    const isLoading = result.key !== requestKey
    const { prices, trend, error } = result
    const overall = median(prices.map((row) => row.medianPricePerKg))
    const lowest = prices.length ? Math.min(...prices.map((row) => Number(row.minPrice))) : null
    const highest = prices.length ? Math.max(...prices.map((row) => Number(row.maxPrice))) : null
    const reports = prices.reduce((sum, row) => sum + Number(row.reportCount || 0), 0)

    return (
        <div className="farmer-dashboard-middle-navigation farmte market">
            <div className="program-feed-heading">
                <h2>Market Prices</h2>
                <p>Farmgate prices reported by Farmers through FarmTE and approved by their Farm-Admin.</p>
            </div>

            <div className="farmte-panel">
                <div className="market-filters">
                    <label><span>Crop</span>
                        <select value={filters.commodity} onChange={(event) => setFilters({ ...filters, commodity: event.target.value })}>
                            {COMMODITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </label>
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
                        </select>
                    </label>
                </div>

                {error && <p className="program-error" role="alert">{error}</p>}

                <div className="farmte-summary-grid market-headline">
                    <div className="farmte-summary-tile is-positive">
                        <small>Typical price</small>
                        <strong>{overall !== null ? `${formatPeso(overall)}/kg` : '-'}</strong>
                        <span>Median across areas</span>
                    </div>
                    <div className="farmte-summary-tile"><small>Lowest reported</small><strong>{lowest !== null ? `${formatPeso(lowest)}/kg` : '-'}</strong></div>
                    <div className="farmte-summary-tile"><small>Highest reported</small><strong>{highest !== null ? `${formatPeso(highest)}/kg` : '-'}</strong></div>
                    <div className="farmte-summary-tile"><small>Sales reports</small><strong>{reports}</strong></div>
                </div>

                <section className="farmte-block">
                    <div className="farmte-block-head">
                        <h4>12-week trend</h4>
                        <p>Weekly median price per kilo.</p>
                    </div>
                    {isLoading ? <p className="market-empty">Loading...</p> : <PriceTrendChart points={trend} />}
                </section>

                <section className="farmte-block">
                    <div className="farmte-block-head">
                        <h4>Prices by area</h4>
                        <p>Only areas with at least 3 sales reports are shown, to keep prices fair.</p>
                    </div>
                    {cardView ? (
                        isLoading ? <p className="market-empty" role="status">Loading prices...</p> : prices.length ? (
                            <div className="fa-card-grid">
                                {prices.map((row) => (
                                    <article className="fa-card" key={`${row.municipality}-${row.variety}-${row.condition}`}>
                                        <strong className="fa-card-title">{row.municipality || '-'}</strong>
                                        <span className="fa-card-sub">{row.variety || 'Any variety'} · {CONDITIONS.find((item) => item.value === row.condition)?.label || row.condition || '-'}</span>
                                        <strong className="market-area-price">{formatPeso(row.medianPricePerKg)}/kg</strong>
                                        <dl className="fa-card-meta">
                                            <dt>Range / kg</dt><dd>{formatPeso(row.minPrice)} – {formatPeso(row.maxPrice)}</dd>
                                            <dt>Reports</dt><dd>{row.reportCount}</dd>
                                            <dt>Latest sale</dt><dd>{row.latestSaleDate ? new Date(row.latestSaleDate).toLocaleDateString() : '-'}</dd>
                                        </dl>
                                    </article>
                                ))}
                            </div>
                        ) : !error && <p className="market-empty">Not enough approved sales reports for this filter yet.</p>
                    ) : <table className="farmte-table">
                        <thead><tr><th>Municipality</th><th>Variety</th><th>Condition</th><th>Median / kg</th><th>Range</th><th>Reports</th><th>Latest sale</th></tr></thead>
                        <tbody>
                            {prices.map((row) => (
                                <tr key={`${row.municipality}-${row.variety}-${row.condition}`}>
                                    <td>{row.municipality || '-'}</td>
                                    <td>{row.variety || 'Any'}</td>
                                    <td>{labelOf(row.condition)}</td>
                                    <td><strong>{formatPeso(row.medianPricePerKg)}</strong></td>
                                    <td>{formatPeso(row.minPrice)} – {formatPeso(row.maxPrice)}</td>
                                    <td>{row.reportCount}</td>
                                    <td>{row.latestSaleDate ? new Date(row.latestSaleDate).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                            {!prices.length && <tr><td colSpan="7">{isLoading ? 'Loading...' : 'Not enough approved sales reports for this filter yet.'}</td></tr>}
                        </tbody>
                    </table>}
                </section>
                <p className="farmte-benefit-note">Dried palay usually sells higher than fresh (wet) palay. Compare prices in the same condition before selling.</p>
            </div>
        </div>
    )
}

export default FarmerMarket
