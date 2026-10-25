import { useEffect, useState } from 'react'
import '../assets/styles/admin.css'
import { formatKg, formatPeso, formatTonsPerHa } from '../services/marketApi.js'

const API_URL = 'http://localhost:8080/api/farm-admin/farmte/reports'
const FILTERS = [
    { value: 'SUBMITTED', label: 'Awaiting review' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'RETURNED', label: 'Returned' },
    { value: '', label: 'All reports' },
]

async function readError(response, fallback) {
    try {
        const body = await response.json()
        return body.message || fallback
    } catch {
        return fallback
    }
}

function formatMoney(value) {
    return `PHP ${Number(value || 0).toFixed(2)}`
}

function FarmAdminFarmTE() {
    const [status, setStatus] = useState('SUBMITTED')
    const [reports, setReports] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedId, setSelectedId] = useState(null)
    const [detail, setDetail] = useState(null)
    const [notes, setNotes] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                setIsLoading(true)
                setError('')
                const query = status ? `?status=${status}` : ''
                const response = await fetch(`${API_URL}${query}`, { credentials: 'include' })
                if (!response.ok) throw new Error(await readError(response, 'Unable to load FarmTE reports.'))
                const data = await response.json()
                if (isActive) setReports(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setError(requestError.message)
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        load()
        return () => { isActive = false }
    }, [status, refreshKey])

    useEffect(() => {
        if (selectedId === null) return undefined
        let isActive = true

        async function load() {
            try {
                const response = await fetch(`${API_URL}/${selectedId}`, { credentials: 'include' })
                if (!response.ok) throw new Error(await readError(response, 'Unable to load this report.'))
                const data = await response.json()
                if (isActive) {
                    setDetail(data)
                    setNotes(data.reviewNotes || '')
                }
            } catch (requestError) {
                if (isActive) setError(requestError.message)
            }
        }

        load()
        return () => { isActive = false }
    }, [selectedId])

    function closeDetail() {
        setSelectedId(null)
        setDetail(null)
        setNotes('')
    }

    async function review(nextStatus) {
        if (nextStatus === 'RETURNED' && !notes.trim()) {
            setError('Please add review notes before returning this report.')
            return
        }

        try {
            setIsSaving(true)
            setError('')
            const response = await fetch(`${API_URL}/${selectedId}/review`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus, reviewNotes: notes.trim() || undefined }),
            })
            if (!response.ok) throw new Error(await readError(response, 'Unable to save your review.'))
            closeDetail()
            setRefreshKey((key) => key + 1)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setIsSaving(false)
        }
    }

    const isFinal = detail && detail.status !== 'SUBMITTED'

    return (
        <main className="farm-admin-land">
            <section className="admin-fo-page">
                <header className="admin-fo-heading">
                    <div>
                        <p className="farm-admin-eyebrow">FARMTE</p>
                        <h1>Farmer time and expense reports</h1>
                    </div>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter reports">
                        {FILTERS.map((filter) => <option key={filter.label} value={filter.value}>{filter.label}</option>)}
                    </select>
                </header>
                {error && <p className="admin-fo-error" role="alert">{error}</p>}
                {reports.length ? (
                    <div className="fa-card-grid">
                        {reports.map((report) => (
                            <button key={report.id} type="button" className="fa-card" onClick={() => setSelectedId(report.id)}>
                                <div className="fa-card-top">
                                    <span className={`status-badge status-${String(report.status || '').toLowerCase()}`}>{report.status}</span>
                                    <span className="fa-card-id">{report.farmCode}</span>
                                </div>
                                <strong className="fa-card-title">{report.farmerName}</strong>
                                <span className="fa-card-sub">{report.reportingPeriodStart} to {report.reportingPeriodEnd}</span>
                                <dl className="fa-card-meta">
                                    <dt>Hours</dt><dd>{report.totalHours}</dd>
                                    <dt>Expenses</dt><dd>{formatMoney(report.totalExpenses)}</dd>
                                </dl>
                                <span className="fa-card-action">View report ?</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="fa-card-empty">{isLoading ? 'Loading reports...' : 'No reports found.'}</p>
                )}
            </section>
            {detail && (
                <div className="admin-modal-backdrop" role="presentation">
                    <section className="admin-modal farmte-review-modal" role="dialog" aria-modal="true" aria-label="FarmTE report details">
                        <header className="farmte-review-head">
                            <div>
                                <h2>{detail.farmerName}</h2>
                                <p className="farmte-review-code">{detail.farmCode}</p>
                            </div>
                            <span className={`status-badge status-${String(detail.status || '').toLowerCase()}`}>{detail.status}</span>
                        </header>

                        <p className="farmte-review-meta">{detail.reportingPeriodStart} to {detail.reportingPeriodEnd} · {detail.totalHours} hours · {formatMoney(detail.totalExpenses)}</p>

                        <section className="farmte-review-section">
                            <h3>Harvest &amp; sales</h3>
                            <p className="farmte-review-note">Review before approving. Approved values feed market insights.</p>
                            <div className="farmte-table-wrap">
                                <table className="admin-data-table farmte-review-table farmte-review-table-wide">
                                    <thead><tr><th>Season</th><th>Harvest</th><th>Yield</th><th>Sold</th><th>Avg price</th><th>Sales</th><th>Cost / kg</th><th>Net income</th></tr></thead>
                                    <tbody>
                                        {(detail.seasonSummaries || []).map((summary) => (
                                            <tr key={summary.seasonId}>
                                                <td>#{summary.seasonId}</td>
                                                <td>{formatKg(summary.totalHarvestKg)}</td>
                                                <td>{formatTonsPerHa(summary.yieldTonsPerHa)}</td>
                                                <td>{formatKg(summary.totalSoldKg)}</td>
                                                <td>{summary.averagePricePerKg ? `${formatPeso(summary.averagePricePerKg)}/kg` : '-'}</td>
                                                <td>{formatPeso(summary.totalSales)}</td>
                                                <td>{summary.costPerKg ? `${formatPeso(summary.costPerKg)}/kg` : '-'}</td>
                                                <td>{formatPeso(summary.netIncome)}</td>
                                            </tr>
                                        ))}
                                        {!(detail.seasonSummaries || []).length && <tr><td colSpan="8">No harvest or sales recorded.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="farmte-review-section">
                            <h3>Time entries</h3>
                            <div className="farmte-table-wrap">
                                <table className="admin-data-table farmte-review-table">
                                    <thead><tr><th>Date</th><th>Activity</th><th>Hours</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        {(detail.timeEntries || []).map((entry) => (
                                            <tr key={entry.id}><td>{entry.date}</td><td>{entry.activity}</td><td>{entry.hours}</td><td>{entry.notes || '-'}</td></tr>
                                        ))}
                                        {!(detail.timeEntries || []).length && <tr><td colSpan="4">None.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="farmte-review-section">
                            <h3>Expense entries</h3>
                            <div className="farmte-table-wrap">
                                <table className="admin-data-table farmte-review-table">
                                    <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        {(detail.expenseEntries || []).map((entry) => (
                                            <tr key={entry.id}><td>{entry.date}</td><td>{entry.category}</td><td>{formatMoney(entry.amount)}</td><td>{entry.notes || '-'}</td></tr>
                                        ))}
                                        {!(detail.expenseEntries || []).length && <tr><td colSpan="4">None.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <label className="admin-modal-label" htmlFor="farmte-review-notes">
                            Review notes {isFinal ? '' : '(required to return)'}
                        </label>
                        <textarea
                            id="farmte-review-notes"
                            className="admin-modal-input farmte-review-notes"
                            rows="4"
                            value={notes}
                            readOnly={isFinal}
                            onChange={(event) => setNotes(event.target.value)}
                        />

                        <div className="admin-modal-actions farmte-review-actions">
                            <button type="button" className="admin-button admin-button-secondary" onClick={closeDetail}>Close</button>
                            {!isFinal && (
                                <>
                                    <button type="button" className="admin-button admin-button-danger" disabled={isSaving} onClick={() => review('RETURNED')}>
                                        {isSaving ? 'Saving...' : 'Return to farmer'}
                                    </button>
                                    <button type="button" className="admin-button admin-button-primary" disabled={isSaving} onClick={() => review('REVIEWED')}>
                                        {isSaving ? 'Saving...' : 'Mark reviewed'}
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </main>
    )
}

export default FarmAdminFarmTE

