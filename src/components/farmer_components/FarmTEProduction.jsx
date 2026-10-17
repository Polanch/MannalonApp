import { useCallback, useEffect, useState } from 'react'
import {
    closeSeason,
    createHarvest,
    createSale,
    createSeason,
    deleteHarvest,
    deleteSale,
    fetchHarvests,
    fetchSales,
    fetchSeasonSummary,
    getApiErrorMessage,
} from '../../services/farmerApi.js'
import {
    BUYER_TYPES,
    COMMODITIES,
    CONDITIONS,
    SEASON_TYPES,
    formatKg,
    formatNumber,
    formatPeso,
    formatTonsPerHa,
    labelOf,
    seasonLabel,
} from '../../services/marketApi.js'

function today() {
    return new Date().toLocaleDateString('en-CA')
}

const EMPTY_SEASON = { commodity: 'RICE', variety: '', seasonType: 'WET', areaHa: '', plantingDate: today(), irrigation: 'IRRIGATED' }
const EMPTY_HARVEST = { harvestDate: today(), sacks: '', kgPerSack: '50', condition: 'FRESH', notes: '' }
const EMPTY_SALE = { saleDate: today(), kgSold: '', pricePerKg: '', condition: 'DRY', buyerType: 'TRADER', locationBarangay: '', locationMunicipality: '' }

function SummaryTiles({ summary }) {
    const net = Number(summary?.netIncome || 0)
    const tiles = [
        { label: 'Total harvest', value: formatKg(summary?.totalHarvestKg) },
        { label: 'Yield', value: formatTonsPerHa(summary?.yieldTonsPerHa), hint: 'Harvest ÷ hectares' },
        { label: 'Average price', value: summary?.averagePricePerKg ? `${formatPeso(summary.averagePricePerKg)}/kg` : '-' },
        { label: 'Total sales', value: formatPeso(summary?.totalSales) },
        { label: 'Total expenses', value: formatPeso(summary?.totalExpenses) },
        { label: 'Cost per kg', value: summary?.costPerKg ? `${formatPeso(summary.costPerKg)}/kg` : '-' },
        { label: 'Net income', value: formatPeso(summary?.netIncome), tone: net < 0 ? 'negative' : 'positive' },
        { label: 'Net income / ha', value: formatPeso(summary?.netIncomePerHa) },
    ]

    return (
        <div className="farmte-summary-grid">
            {tiles.map((tile) => (
                <div key={tile.label} className={`farmte-summary-tile${tile.tone ? ` is-${tile.tone}` : ''}`}>
                    <small>{tile.label}</small>
                    <strong>{tile.value}</strong>
                    {tile.hint && <span>{tile.hint}</span>}
                </div>
            ))}
        </div>
    )
}

function SeasonForm({ userId, onCreated, onCancel }) {
    const [form, setForm] = useState(EMPTY_SEASON)
    const [error, setError] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    async function submit(event) {
        event.preventDefault()
        if (!(Number(form.areaHa) > 0)) {
            setError('Enter the area planted in hectares.')
            return
        }
        try {
            setIsSaving(true)
            setError('')
            const season = await createSeason({ userId, ...form })
            onCreated(season)
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to start this season.'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <form className="farmte-form farmte-season-form" onSubmit={submit}>
            <h3 className="farmte-wide">Start a crop season</h3>
            <label><span>Crop</span>
                <select value={form.commodity} onChange={(event) => setForm({ ...form, commodity: event.target.value })}>
                    {COMMODITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
            </label>
            <label><span>Variety</span><input value={form.variety} placeholder="e.g. RC 222" onChange={(event) => setForm({ ...form, variety: event.target.value })} /></label>
            <label><span>Season</span>
                <select value={form.seasonType} onChange={(event) => setForm({ ...form, seasonType: event.target.value })}>
                    {SEASON_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
            </label>
            <label><span>Area planted (hectares)</span><input type="number" min="0.01" step="0.01" value={form.areaHa} onChange={(event) => setForm({ ...form, areaHa: event.target.value })} required /></label>
            <label><span>Planting date</span><input type="date" value={form.plantingDate} onChange={(event) => setForm({ ...form, plantingDate: event.target.value })} /></label>
            <label><span>Water source</span>
                <select value={form.irrigation} onChange={(event) => setForm({ ...form, irrigation: event.target.value })}>
                    <option value="IRRIGATED">Irrigated</option>
                    <option value="RAINFED">Rainfed</option>
                </select>
            </label>
            {error && <p className="program-error farmte-wide" role="alert">{error}</p>}
            <div className="farmte-form-actions farmte-wide">
                {onCancel && <button type="button" className="farmte-secondary" onClick={onCancel}>Cancel</button>}
                <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Start season'}</button>
            </div>
        </form>
    )
}

function SeasonDetail({ userId, season, onSeasonChanged }) {
    const [harvests, setHarvests] = useState([])
    const [sales, setSales] = useState([])
    const [summary, setSummary] = useState(null)
    const [harvestForm, setHarvestForm] = useState(EMPTY_HARVEST)
    const [saleForm, setSaleForm] = useState(EMPTY_SALE)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const isClosed = season.status === 'CLOSED'

    const reload = useCallback(async () => {
        try {
            const [harvestData, saleData, summaryData] = await Promise.all([
                fetchHarvests({ seasonId: season.id }),
                fetchSales({ seasonId: season.id }),
                fetchSeasonSummary({ seasonId: season.id }),
            ])
            setHarvests(Array.isArray(harvestData) ? harvestData : [])
            setSales(Array.isArray(saleData) ? saleData : [])
            setSummary(summaryData)
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to load this season.'))
        } finally {
            setIsLoading(false)
        }
    }, [season.id])

    useEffect(() => {
        Promise.resolve().then(reload)
    }, [reload])

    async function run(action, fallback) {
        setError('')
        try {
            await action()
            await reload()
            return true
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, fallback))
            return false
        }
    }

    async function submitHarvest(event) {
        event.preventDefault()
        if (!(Number(harvestForm.sacks) > 0) || !(Number(harvestForm.kgPerSack) > 0)) return
        if (await run(() => createHarvest({ userId, seasonId: season.id, ...harvestForm }), 'Unable to save this harvest.')) {
            setHarvestForm({ ...EMPTY_HARVEST, condition: harvestForm.condition, kgPerSack: harvestForm.kgPerSack })
        }
    }

    async function submitSale(event) {
        event.preventDefault()
        if (!(Number(saleForm.kgSold) > 0) || !(Number(saleForm.pricePerKg) > 0)) return
        if (await run(() => createSale({ userId, seasonId: season.id, ...saleForm }), 'Unable to save this sale.')) {
            setSaleForm({ ...EMPTY_SALE, condition: saleForm.condition, buyerType: saleForm.buyerType, locationBarangay: saleForm.locationBarangay, locationMunicipality: saleForm.locationMunicipality })
        }
    }

    async function endSeason() {
        if (!window.confirm('Close this season? You will no longer be able to add harvests or sales to it.')) return
        setError('')
        try {
            const updated = await closeSeason({ userId, seasonId: season.id })
            onSeasonChanged(updated)
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to close this season.'))
        }
    }

    const harvestPreview = Number(harvestForm.sacks) * Number(harvestForm.kgPerSack)
    const salePreview = Number(saleForm.kgSold) * Number(saleForm.pricePerKg)
    const unsoldKg = Math.max(0, Number(summary?.totalHarvestKg || 0) - Number(summary?.totalSoldKg || 0))

    return (
        <div className="farmte-season-detail">
            <header className="farmte-season-head">
                <div>
                    <span className={`farmte-status farmte-status-${isClosed ? 'closed' : 'active'}`}>{isClosed ? 'Closed' : 'Active'}</span>
                    <h3>{seasonLabel(season)}</h3>
                    <p>
                        {formatNumber(season.areaHa)} ha · {labelOf(season.irrigation)}
                        {season.plantingDate && ` · Planted ${new Date(season.plantingDate).toLocaleDateString()}`}
                    </p>
                </div>
                {!isClosed && <button type="button" className="farmte-secondary" onClick={endSeason}>Close season</button>}
            </header>

            {error && <p className="program-error" role="alert">{error}</p>}
            {isLoading ? <p className="farmte-total">Loading season...</p> : <SummaryTiles summary={summary} />}

            <section className="farmte-block">
                <div className="farmte-block-head">
                    <h4>Harvests</h4>
                    <p>Record each harvest. Most rice sacks weigh about 50 kg.</p>
                </div>
                {!isClosed && (
                    <form className="farmte-form" onSubmit={submitHarvest}>
                        <label><span>Harvest date</span><input type="date" value={harvestForm.harvestDate} onChange={(event) => setHarvestForm({ ...harvestForm, harvestDate: event.target.value })} required /></label>
                        <label><span>Number of sacks</span><input type="number" min="1" step="1" value={harvestForm.sacks} onChange={(event) => setHarvestForm({ ...harvestForm, sacks: event.target.value })} required /></label>
                        <label><span>Kilos per sack</span><input type="number" min="1" step="0.1" value={harvestForm.kgPerSack} onChange={(event) => setHarvestForm({ ...harvestForm, kgPerSack: event.target.value })} required /></label>
                        <label><span>Condition</span>
                            <select value={harvestForm.condition} onChange={(event) => setHarvestForm({ ...harvestForm, condition: event.target.value })}>
                                {CONDITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </label>
                        <label className="farmte-wide"><span>Notes</span><input value={harvestForm.notes} onChange={(event) => setHarvestForm({ ...harvestForm, notes: event.target.value })} /></label>
                        <p className="farmte-preview farmte-wide">Total: <strong>{harvestPreview > 0 ? formatKg(harvestPreview) : '-'}</strong></p>
                        <button type="submit">Add harvest</button>
                    </form>
                )}
                <table className="farmte-table">
                    <thead><tr><th>Date</th><th>Sacks</th><th>Kg / sack</th><th>Total</th><th>Condition</th><th>Notes</th><th /></tr></thead>
                    <tbody>
                        {harvests.map((harvest) => (
                            <tr key={harvest.id}>
                                <td>{harvest.harvestDate}</td>
                                <td>{formatNumber(harvest.sacks, 0)}</td>
                                <td>{formatNumber(harvest.kgPerSack, 1)}</td>
                                <td><strong>{formatKg(harvest.totalKg)}</strong></td>
                                <td>{labelOf(harvest.condition)}</td>
                                <td>{harvest.notes || '-'}</td>
                                <td>{!isClosed && <button type="button" className="farmte-delete" onClick={() => run(() => deleteHarvest({ id: harvest.id, userId }), 'Unable to delete this harvest.')}>Delete</button>}</td>
                            </tr>
                        ))}
                        {!harvests.length && <tr><td colSpan="7">{isLoading ? 'Loading...' : 'No harvests recorded yet.'}</td></tr>}
                    </tbody>
                </table>
            </section>

            <section className="farmte-block">
                <div className="farmte-block-head">
                    <h4>Sales</h4>
                    <p>Record every sale with the price you got per kilo. This builds the market price board. {summary && <>Unsold: <strong>{formatKg(unsoldKg)}</strong></>}</p>
                </div>
                {!isClosed && (
                    <form className="farmte-form" onSubmit={submitSale}>
                        <label><span>Date sold</span><input type="date" value={saleForm.saleDate} onChange={(event) => setSaleForm({ ...saleForm, saleDate: event.target.value })} required /></label>
                        <label><span>Kilos sold</span><input type="number" min="0.1" step="0.1" value={saleForm.kgSold} onChange={(event) => setSaleForm({ ...saleForm, kgSold: event.target.value })} required /></label>
                        <label><span>Price per kilo (₱)</span><input type="number" min="0.01" step="0.01" value={saleForm.pricePerKg} onChange={(event) => setSaleForm({ ...saleForm, pricePerKg: event.target.value })} required /></label>
                        <label><span>Condition</span>
                            <select value={saleForm.condition} onChange={(event) => setSaleForm({ ...saleForm, condition: event.target.value })}>
                                {CONDITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </label>
                        <label><span>Sold to</span>
                            <select value={saleForm.buyerType} onChange={(event) => setSaleForm({ ...saleForm, buyerType: event.target.value })}>
                                {BUYER_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </label>
                        <label><span>Barangay sold</span><input value={saleForm.locationBarangay} onChange={(event) => setSaleForm({ ...saleForm, locationBarangay: event.target.value })} /></label>
                        <label><span>Municipality sold</span><input value={saleForm.locationMunicipality} onChange={(event) => setSaleForm({ ...saleForm, locationMunicipality: event.target.value })} /></label>
                        <p className="farmte-preview farmte-wide">Sale amount: <strong>{salePreview > 0 ? formatPeso(salePreview) : '-'}</strong></p>
                        <button type="submit">Add sale</button>
                    </form>
                )}
                <table className="farmte-table">
                    <thead><tr><th>Date</th><th>Kilos</th><th>Price / kg</th><th>Amount</th><th>Condition</th><th>Buyer</th><th>Location</th><th /></tr></thead>
                    <tbody>
                        {sales.map((sale) => (
                            <tr key={sale.id}>
                                <td>{sale.saleDate}</td>
                                <td>{formatKg(sale.kgSold)}</td>
                                <td>{formatPeso(sale.pricePerKg)}</td>
                                <td><strong>{formatPeso(sale.totalAmount)}</strong></td>
                                <td>{labelOf(sale.condition)}</td>
                                <td>{labelOf(sale.buyerType)}</td>
                                <td>{[sale.locationBarangay, sale.locationMunicipality].filter(Boolean).join(', ') || '-'}</td>
                                <td>{!isClosed && <button type="button" className="farmte-delete" onClick={() => run(() => deleteSale({ id: sale.id, userId }), 'Unable to delete this sale.')}>Delete</button>}</td>
                            </tr>
                        ))}
                        {!sales.length && <tr><td colSpan="8">{isLoading ? 'Loading...' : 'No sales recorded yet.'}</td></tr>}
                    </tbody>
                </table>
            </section>
        </div>
    )
}

function FarmTEProduction({ userId, seasons, seasonsError, isLoading, onSeasonCreated, onSeasonChanged }) {
    const [selectedId, setSelectedId] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const selected = seasons.find((season) => season.id === selectedId) || seasons.find((season) => season.status !== 'CLOSED') || seasons[0]

    if (isLoading) return <p className="farmte-total">Loading seasons...</p>

    if (!seasons.length || isCreating) {
        return (
            <>
                {seasonsError && <p className="program-error" role="alert">{seasonsError}</p>}
                {!seasons.length && (
                    <div className="farmte-intro">
                        <h3>Track your harvest and sales</h3>
                        <p>Start a crop season, then record each harvest (sacks × kilos per sack) and each sale (kilos × price per kilo). FarmTE computes your yield, average price and net income, and approved reports help the MAO publish fair market prices.</p>
                    </div>
                )}
                <SeasonForm
                    userId={userId}
                    onCancel={seasons.length ? () => setIsCreating(false) : null}
                    onCreated={(season) => {
                        onSeasonCreated(season)
                        setSelectedId(season.id)
                        setIsCreating(false)
                    }}
                />
            </>
        )
    }

    return (
        <>
            {seasonsError && <p className="program-error" role="alert">{seasonsError}</p>}
            <div className="farmte-season-bar">
                <label><span>Season</span>
                    <select value={selected?.id ?? ''} onChange={(event) => setSelectedId(Number(event.target.value))}>
                        {seasons.map((season) => (
                            <option key={season.id} value={season.id}>{seasonLabel(season)}{season.status === 'CLOSED' ? ' (closed)' : ''}</option>
                        ))}
                    </select>
                </label>
                <button type="button" onClick={() => setIsCreating(true)}>+ New season</button>
            </div>
            {selected && <SeasonDetail key={selected.id} userId={userId} season={selected} onSeasonChanged={onSeasonChanged} />}
        </>
    )
}

export default FarmTEProduction
