import { useCallback, useEffect, useState } from 'react'
import {
    createExpenseEntry,
    createTimeEntry,
    deleteExpenseEntry,
    deleteTimeEntry,
    fetchExpenseEntries,
    fetchFarmReports,
    fetchProgramBenefit,
    fetchPrograms,
    fetchProfile,
    fetchSeasons,
    fetchTimeEntries,
    getApiErrorMessage,
    getFarmerSession,
    saveFarmerSession,
    submitFarmReport,
} from '../../services/farmerApi.js'
import { formatKg, formatPeso, formatTonsPerHa, seasonLabel } from '../../services/marketApi.js'
import FarmTEProduction from './FarmTEProduction.jsx'

const TABS = ['Production', 'Time', 'Expense', 'Benefit', 'Reports']
const EXPENSE_CATEGORIES = ['Seeds', 'Fertilizer', 'Pesticide', 'Labor', 'Equipment', 'Fuel', 'Other']
const ACTIVITIES = ['Land preparation', 'Planting', 'Irrigation', 'Fertilizing', 'Weeding', 'Pest control', 'Harvesting', 'Other']

function today() {
    return new Date().toLocaleDateString('en-CA')
}

function monthStart() {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA')
}

function formatMoney(value) {
    return `PHP ${Number(value || 0).toFixed(2)}`
}

function useEntries({ userId, load, create, remove }) {
    const [entries, setEntries] = useState([])
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const reload = useCallback(async () => {
        try {
            const data = await load({ userId })
            setEntries(Array.isArray(data) ? data : [])
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to load entries.'))
        } finally {
            setIsLoading(false)
        }
    }, [userId, load])

    useEffect(() => {
        Promise.resolve().then(reload)
    }, [reload])

    async function add(values) {
        setError('')
        try {
            await create({ userId, ...values })
            await reload()
            return true
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to save this entry.'))
            return false
        }
    }

    async function removeEntry(id) {
        setError('')
        try {
            await remove({ id, userId })
            await reload()
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to delete this entry.'))
        }
    }

    return { entries, error, isLoading, add, removeEntry }
}

function SeasonSelect({ seasons, value, onChange }) {
    const activeSeasons = seasons.filter((season) => season.status !== 'CLOSED')
    return (
        <label><span>Season (optional)</span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="">Not linked</option>
                {activeSeasons.map((season) => <option key={season.id} value={season.id}>{seasonLabel(season)}</option>)}
            </select>
        </label>
    )
}

function seasonName(seasons, seasonId) {
    if (!seasonId) return '-'
    const season = seasons.find((item) => item.id === seasonId)
    return season ? seasonLabel(season) : `Season #${seasonId}`
}

function TimeTab({ userId, seasons }) {
    const { entries, error, isLoading, add, removeEntry } = useEntries({ userId, load: fetchTimeEntries, create: createTimeEntry, remove: deleteTimeEntry })
    const [form, setForm] = useState({ date: today(), activity: ACTIVITIES[0], hours: '', notes: '', seasonId: '' })

    async function submit(event) {
        event.preventDefault()
        if (!form.hours || Number(form.hours) <= 0) return
        if (await add(form)) setForm({ ...form, hours: '', notes: '' })
    }

    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0)

    return (
        <>
            <form className="farmte-form" onSubmit={submit}>
                <label><span>Date</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
                <label><span>Activity</span>
                    <select value={form.activity} onChange={(event) => setForm({ ...form, activity: event.target.value })}>
                        {ACTIVITIES.map((activity) => <option key={activity}>{activity}</option>)}
                    </select>
                </label>
                <label><span>Hours</span><input type="number" min="0.5" step="0.5" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} required /></label>
                <SeasonSelect seasons={seasons} value={form.seasonId} onChange={(seasonId) => setForm({ ...form, seasonId })} />
                <label className="farmte-wide"><span>Notes</span><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
                <button type="submit">Add time entry</button>
            </form>
            {error && <p className="program-error" role="alert">{error}</p>}
            <p className="farmte-total">Total hours logged: <strong>{totalHours}</strong></p>
            <table className="farmte-table">
                <thead><tr><th>Date</th><th>Activity</th><th>Hours</th><th>Season</th><th>Notes</th><th /></tr></thead>
                <tbody>
                    {entries.map((entry) => (
                        <tr key={entry.id}>
                            <td>{entry.date}</td><td>{entry.activity}</td><td>{entry.hours}</td><td>{seasonName(seasons, entry.seasonId)}</td><td>{entry.notes || '-'}</td>
                            <td><button type="button" className="farmte-delete" onClick={() => removeEntry(entry.id)}>Delete</button></td>
                        </tr>
                    ))}
                    {!entries.length && <tr><td colSpan="6">{isLoading ? 'Loading...' : 'No time entries yet.'}</td></tr>}
                </tbody>
            </table>
        </>
    )
}

function ExpenseTab({ userId, seasons }) {
    const { entries, error, isLoading, add, removeEntry } = useEntries({ userId, load: fetchExpenseEntries, create: createExpenseEntry, remove: deleteExpenseEntry })
    const [form, setForm] = useState({ date: today(), category: EXPENSE_CATEGORIES[0], amount: '', notes: '', seasonId: '' })

    async function submit(event) {
        event.preventDefault()
        if (!form.amount || Number(form.amount) <= 0) return
        if (await add(form)) setForm({ ...form, amount: '', notes: '' })
    }

    const total = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

    return (
        <>
            <form className="farmte-form" onSubmit={submit}>
                <label><span>Date</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
                <label><span>Category</span>
                    <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                        {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                    </select>
                </label>
                <label><span>Amount (PHP)</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
                <SeasonSelect seasons={seasons} value={form.seasonId} onChange={(seasonId) => setForm({ ...form, seasonId })} />
                <label className="farmte-wide"><span>Notes</span><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
                <button type="submit">Add expense</button>
            </form>
            {error && <p className="program-error" role="alert">{error}</p>}
            <p className="farmte-total">Total expenses: <strong>{formatMoney(total)}</strong> · Link expenses to a season so FarmTE can compute your cost per kilo.</p>
            <table className="farmte-table">
                <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Season</th><th>Notes</th><th /></tr></thead>
                <tbody>
                    {entries.map((entry) => (
                        <tr key={entry.id}>
                            <td>{entry.date}</td><td>{entry.category}</td><td>{formatMoney(entry.amount)}</td><td>{seasonName(seasons, entry.seasonId)}</td><td>{entry.notes || '-'}</td>
                            <td><button type="button" className="farmte-delete" onClick={() => removeEntry(entry.id)}>Delete</button></td>
                        </tr>
                    ))}
                    {!entries.length && <tr><td colSpan="6">{isLoading ? 'Loading...' : 'No expenses yet.'}</td></tr>}
                </tbody>
            </table>
        </>
    )
}

function BenefitTab({ userId }) {
    const [benefits, setBenefits] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                const programs = await fetchPrograms({ userId })
                const approved = (Array.isArray(programs) ? programs : []).filter((program) => program.myApplicationStatus === 'APPROVED')
                const details = await Promise.all(approved.map((program) => fetchProgramBenefit({ programId: program.id, userId })))
                if (isActive) setBenefits(details)
            } catch (requestError) {
                if (isActive) setError(getApiErrorMessage(requestError, 'Unable to load your benefits.'))
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        load()
        return () => { isActive = false }
    }, [userId])

    if (isLoading) return <p className="farmte-total">Loading benefits...</p>

    return (
        <>
            {error && <p className="program-error" role="alert">{error}</p>}
            {!benefits.length && !error && <p className="farmte-total">You are not approved for any Program yet. Sign up from the Community tab.</p>}
            {benefits.map((program) => (
                <section key={program.id} className="farmte-benefit-card">
                    <header className="farmte-benefit-head">
                        <div>
                            <span className="farmte-benefit-badge">Approved</span>
                            <h3>{program.name}</h3>
                        </div>
                        <div className="farmte-code-box">
                            <small>Program code</small>
                            <span className="farmte-code">{program.code}</span>
                        </div>
                    </header>
                    {program.description && <p className="farmte-benefit-description">{program.description}</p>}
                    <h4 className="farmte-benefit-title">Benefits you receive</h4>
                    <ul className="farmte-benefit-list">
                        {(program.benefits || []).map((benefit) => (
                            <li key={benefit.id}>
                                <span className="farmte-benefit-icon" aria-hidden="true">✓</span>
                                <div>
                                    <strong>{benefit.name}</strong>
                                    {benefit.description && <p>{benefit.description}</p>}
                                </div>
                            </li>
                        ))}
                        {!(program.benefits || []).length && <li className="farmte-benefit-empty">No benefits listed.</li>}
                    </ul>
                    <p className="farmte-benefit-note">Show your Program code to the Farm-Admin when claiming your benefits.</p>
                </section>
            ))}
        </>
    )
}

function ReportRow({ report, seasons }) {
    const summaries = Array.isArray(report.seasonSummaries) ? report.seasonSummaries : []

    return (
        <>
            <tr>
                <td>{report.reportingPeriodStart} to {report.reportingPeriodEnd}</td>
                <td>{report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : '-'}</td>
                <td>{report.totalHours}</td>
                <td>{formatMoney(report.totalExpenses)}</td>
                <td><span className={`farmte-status farmte-status-${String(report.status).toLowerCase()}`}>{report.status}</span></td>
                <td>{report.reviewNotes || '-'}</td>
            </tr>
            {summaries.map((summary) => (
                <tr key={summary.seasonId} className="farmte-report-season">
                    <td colSpan="6">
                        <strong>{seasonName(seasons, summary.seasonId)}</strong>
                        <span>Harvest {formatKg(summary.totalHarvestKg)}</span>
                        <span>Yield {formatTonsPerHa(summary.yieldTonsPerHa)}</span>
                        <span>Avg price {summary.averagePricePerKg ? `${formatPeso(summary.averagePricePerKg)}/kg` : '-'}</span>
                        <span>Net income {formatPeso(summary.netIncome)}</span>
                    </td>
                </tr>
            ))}
        </>
    )
}

function ReportsTab({ userId, seasons }) {
    const [reports, setReports] = useState([])
    const [period, setPeriod] = useState({ periodStart: monthStart(), periodEnd: today() })
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const reload = useCallback(async () => {
        try {
            const data = await fetchFarmReports({ userId })
            setReports(Array.isArray(data) ? data : [])
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to load your reports.'))
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        Promise.resolve().then(reload)
    }, [reload])

    async function submit(event) {
        event.preventDefault()
        try {
            setIsSubmitting(true)
            setError('')
            setNotice('')
            await submitFarmReport({ userId, ...period })
            setNotice('Report submitted to your Farm-Admin.')
            await reload()
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to submit your report.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <form className="farmte-form" onSubmit={submit}>
                <label><span>Period start</span><input type="date" value={period.periodStart} max={period.periodEnd} onChange={(event) => setPeriod({ ...period, periodStart: event.target.value })} required /></label>
                <label><span>Period end</span><input type="date" value={period.periodEnd} min={period.periodStart} onChange={(event) => setPeriod({ ...period, periodEnd: event.target.value })} required /></label>
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit report'}</button>
            </form>
            <p className="farmte-total">Your time, expense, harvest and sales records in this period are sent to your Farm-Admin for review. Approved reports count toward the market price board.</p>
            {notice && <p className="program-notice" role="status">{notice}</p>}
            {error && <p className="program-error" role="alert">{error}</p>}
            <table className="farmte-table">
                <thead><tr><th>Period</th><th>Submitted</th><th>Hours</th><th>Expenses</th><th>Status</th><th>Farm-Admin notes</th></tr></thead>
                <tbody>
                    {reports.map((report) => (
                        <ReportRow key={report.id} report={report} seasons={seasons} />
                    ))}
                    {!reports.length && <tr><td colSpan="6">{isLoading ? 'Loading...' : 'No reports submitted yet.'}</td></tr>}
                </tbody>
            </table>
        </>
    )
}

function FarmTE({ session }) {
    const [activeTab, setActiveTab] = useState('Production')
    const [farmId, setFarmId] = useState(session.farmId ?? null)
    const [seasons, setSeasons] = useState([])
    const [seasonsError, setSeasonsError] = useState('')
    const [isSeasonsLoading, setIsSeasonsLoading] = useState(true)

    useEffect(() => {
        let isActive = true

        async function load() {
            let keepLoading = false
            try {
                let resolvedFarmId = farmId
                if (!resolvedFarmId) {
                    const profile = await fetchProfile({ userId: session.userId })
                    resolvedFarmId = profile?.farmId ?? profile?.farm?.farmId ?? null
                    if (!resolvedFarmId) return
                    const stored = getFarmerSession()
                    if (stored) saveFarmerSession({ ...stored, farmId: resolvedFarmId })
                    keepLoading = true
                    if (isActive) setFarmId(resolvedFarmId)
                    return
                }
                const data = await fetchSeasons({ userId: session.userId, farmId: resolvedFarmId })
                if (isActive) setSeasons(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setSeasonsError(getApiErrorMessage(requestError, 'Unable to load your seasons.'))
            } finally {
                if (isActive && !keepLoading) setIsSeasonsLoading(false)
            }
        }

        load()
        return () => { isActive = false }
    }, [session.userId, farmId])

    function handleSeasonCreated(season) {
        setSeasons((current) => [season, ...current.filter((item) => item.id !== season.id)])
        if (!farmId && season.farmId) {
            const stored = getFarmerSession()
            if (stored) saveFarmerSession({ ...stored, farmId: season.farmId })
            setFarmId(season.farmId)
        }
    }

    function handleSeasonChanged(season) {
        setSeasons((current) => current.map((item) => (item.id === season.id ? season : item)))
    }

    return (
        <div className="farmer-dashboard-middle-navigation farmte">
            <div className="program-feed-heading">
                <h2>FarmTE</h2>
                <p>Record your harvests, sales, time and expenses, then submit timely reports to your Farm-Admin.</p>
            </div>
            <div className="farmte-tabs" role="tablist">
                {TABS.map((tab) => (
                    <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                        {tab}
                    </button>
                ))}
            </div>
            <div className="farmte-panel">
                {activeTab === 'Production' && (
                    <FarmTEProduction
                        userId={session.userId}
                        seasons={seasons}
                        seasonsError={seasonsError}
                        isLoading={isSeasonsLoading}
                        onSeasonCreated={handleSeasonCreated}
                        onSeasonChanged={handleSeasonChanged}
                    />
                )}
                {activeTab === 'Time' && <TimeTab userId={session.userId} seasons={seasons} />}
                {activeTab === 'Benefit' && <BenefitTab userId={session.userId} />}
                {activeTab === 'Expense' && <ExpenseTab userId={session.userId} seasons={seasons} />}
                {activeTab === 'Reports' && <ReportsTab userId={session.userId} seasons={seasons} />}
            </div>
        </div>
    )
}

export default FarmTE
