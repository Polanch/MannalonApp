import { useCallback, useState } from 'react'
import useTicketResource from '../hooks/useTicketResource.js'
import {
    fetchTicketAssignees, fetchTicketCategories, fetchTicketInsights, fetchTickets, fetchTicketSession,
    formatTicketDate, ticketDateFilter, ticketLabel, TICKET_STATUSES,
} from '../services/ticketingApi.js'
import TicketDetail from './TicketDetail.jsx'
import { RentalReportSummary, TicketCreateForm } from './TicketingForms.jsx'
import '../assets/styles/ticketing.css'

const EMPTY_FILTERS = { search: '', category: '', status: '', severity: '', assignee: '', escalation: '', from: '', to: '' }

function TicketInsights({ dates, assignees }) {
    const load = useCallback((signal) => fetchTicketInsights(dates, signal), [dates])
    const resource = useTicketResource(load)
    const data = resource.data
    return (
        <section className="ticket-insights" aria-label="Ticket insights">
            <h2>Support insights</h2>
            {resource.error && <p className="ticket-error" role="alert">{resource.error}<button type="button" onClick={resource.refresh}>Retry insights</button></p>}
            {resource.loading && <p role="status">Loading insights...</p>}
            {data && <>
                <div className="ticket-stat-grid">
                    {[
                        ['Unassigned tickets', data.unassignedCount],
                        ['Awaiting settlement (all time)', data.awaitingSettlementReports],
                        ['Escalated / unsettled (all time)', data.escalatedUnsettledReports],
                        ['Resolved', data.resolvedCount], ['Cancelled', data.cancelledCount],
                        ['Average closure time', data.averageResolutionHours === null ? 'No closed tickets' : `${data.averageResolutionHours.toFixed(1)} hours`],
                    ].map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
                </div>
                <div className="ticket-chart-grid">
                    {[
                        ['Tickets by status', data.byStatus, ticketLabel],
                        ['Tickets by category', data.byCategory, ticketLabel],
                        ['Tickets by severity', data.bySeverity, (key) => `Severity ${key}`],
                        ['Open Admin workload', data.adminWorkload, (key) => assignees.find((admin) => String(admin.globalId) === key)?.userName || `Admin #${key}`],
                    ].map(([title, groups, label]) => <section className="ticket-panel" key={title}>
                        <h3>{title}</h3>
                        {groups.length === 0 && <p>No assigned work.</p>}
                        {groups.map((group) => <div className="ticket-chart-row" key={group.key}>
                            <span>{label(group.key)}</span><strong>{group.count}</strong>
                            <progress aria-label={`${label(group.key)}: ${group.count}`} value={group.count} max={Math.max(1, ...groups.map((item) => item.count))} />
                        </div>)}
                    </section>)}
                </div>
                <p className="ticket-muted">Ticket metrics use the applied creation-date range. Rental settlement/escalation totals are all-time. Average closure time includes resolved and cancelled tickets, as returned by the backend.</p>
            </>}
        </section>
    )
}

export default function TicketingPage({ initialTicketId = null }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const [applied, setApplied] = useState(EMPTY_FILTERS)
    const [page, setPage] = useState(0)
    const [selectedId, setSelectedId] = useState(initialTicketId)
    const [create, setCreate] = useState(false)
    const [notice, setNotice] = useState('')
    const [error, setError] = useState('')
    const [insights, setInsights] = useState(false)
    const loadSupport = useCallback(async (signal) => {
        const session = await fetchTicketSession(signal)
        const adminMode = ['Admin', 'MAO-Admin'].includes(session.role)
        const [categories, assignees] = await Promise.all([
            fetchTicketCategories(signal),
            adminMode ? fetchTicketAssignees(signal) : Promise.resolve([]),
        ])
        return { session, adminMode, categories, assignees }
    }, [])
    const support = useTicketResource(loadSupport, false)
    const loadList = useCallback((signal) => fetchTickets({ ...applied, page, size: 20 }, signal), [applied, page])
    const list = useTicketResource(loadList)
    const [insightDates, setInsightDates] = useState({})
    const adminMode = support.data?.adminMode
    const canCreate = ['Farmer', 'Farm-Admin'].includes(support.data?.session.role)

    function changed(message) {
        setNotice(message)
        list.refresh()
    }

    function filter(event) {
        event.preventDefault()
        try {
            const from = ticketDateFilter(filters.from)
            const to = ticketDateFilter(filters.to)
            if (from && to && from > to) throw new Error('From must be before or equal to To.')
            setApplied({ ...filters, from, to })
            setInsightDates({ from, to })
            setPage(0)
            setError('')
        } catch (failure) {
            setError(failure.message)
        }
    }

    function field(key, value) { setFilters({ ...filters, [key]: value }) }

    return (
        <main className="ticket-page">
            <header className="ticket-page-header">
                <div><p className="ticket-eyebrow">MANNALON SUPPORT</p><h1>Ticketing center</h1><p>Track system issues, follow discussions, and settle rental reports.</p></div>
                <div className="ticket-actions">
                    {canCreate && <button className="ticket-primary" type="button" disabled={Boolean(support.error)} onClick={() => { setSelectedId(null); setCreate(true); setNotice('') }}>New ticket</button>}
                    {adminMode && <button type="button" aria-pressed={insights} onClick={() => { setInsights(!insights); setInsightDates({ from: applied.from || undefined, to: applied.to || undefined }) }}>Insights</button>}
                    <button type="button" onClick={() => { support.refresh(); list.refresh() }}>Refresh</button>
                </div>
            </header>
            <p className="ticket-live"><span />Auto-refresh every 15 seconds while this page is open. Displayed times are local; date filters are UTC.</p>
            {support.error && <p className="ticket-error" role="alert">{support.error} <button type="button" onClick={support.refresh}>Retry access</button></p>}
            {support.loading && <p role="status">Loading ticketing access...</p>}
            {notice && <p className="ticket-success" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>Dismiss</button></p>}
            {support.data && !support.error && (selectedId ? (
                <TicketDetail key={selectedId} id={selectedId} session={support.data.session} assignees={support.data.assignees} adminMode={adminMode}
                    onClose={() => setSelectedId(null)} onChanged={changed} />
            ) : <>
                {create && <TicketCreateForm categories={support.data.categories} onCancel={() => setCreate(false)} onCreated={(detail) => {
                    setCreate(false); setSelectedId(detail.ticket.id); changed(`${detail.ticket.ticketNumber} created.`)
                }} />}
                <form className="ticket-filters" onSubmit={filter}>
                    <label>Search<input value={filters.search} placeholder="Ticket number or subject" onChange={(event) => field('search', event.target.value)} /></label>
                    <label>Category<select value={filters.category} onChange={(event) => field('category', event.target.value)}><option value="">All categories</option>{support.data.categories.map((category) => <option key={category} value={category}>{ticketLabel(category)}</option>)}</select></label>
                    <label>Status<select value={filters.status} onChange={(event) => field('status', event.target.value)}><option value="">All statuses</option>{TICKET_STATUSES.map((status) => <option key={status} value={status}>{ticketLabel(status)}</option>)}</select></label>
                    <label>Severity<select value={filters.severity} onChange={(event) => field('severity', event.target.value)}><option value="">All severities</option><option value="1">1 - Highest</option><option value="2">2 - Medium</option><option value="3">3 - Standard</option></select></label>
                    {adminMode && <label>Assigned Admin<select value={filters.assignee} onChange={(event) => field('assignee', event.target.value)}><option value="">All Admins</option>{support.data.assignees.map((admin) => <option key={admin.globalId} value={admin.globalId}>{admin.userName || admin.userId} (#{admin.globalId})</option>)}</select></label>}
                    <label>Escalation<select value={filters.escalation} onChange={(event) => field('escalation', event.target.value)}><option value="">All tickets</option><option value="true">Escalated rental reports</option><option value="false">Not escalated</option></select></label>
                    <label>Created from (UTC)<input type="datetime-local" value={filters.from} onChange={(event) => field('from', event.target.value)} /></label>
                    <label>Created to (UTC)<input type="datetime-local" value={filters.to} onChange={(event) => field('to', event.target.value)} /></label>
                    <div className="ticket-actions"><button className="ticket-primary" type="submit">Apply filters</button><button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setInsightDates({}); setPage(0); setError('') }}>Reset</button></div>
                    {adminMode && <button type="button" onClick={() => {
                        const next = { ...EMPTY_FILTERS, escalation: 'true' }
                        setFilters(next); setApplied(next); setInsightDates({}); setPage(0); setError('')
                    }}>Admin escalation queue</button>}
                </form>
                {error && <p className="ticket-error" role="alert">{error}</p>}
                {adminMode && insights && <TicketInsights dates={insightDates} assignees={support.data.assignees} />}
                {list.error && <p className="ticket-error" role="alert">{list.error} Listed data may be out of date.<button type="button" onClick={list.refresh}>Retry list</button></p>}
                {list.loading ? <p role="status">Loading tickets...</p> : list.data && <>
                    <p className="ticket-muted">{list.data.totalElements} tickets &middot; {adminMode ? 'All authorized tickets' : 'Your tickets and rental reports involving you'}</p>
                    {list.data.items.length === 0 && <section className="ticket-empty"><h2>No tickets found</h2><p>Try different filters{canCreate ? ' or create a ticket for a system issue.' : '.'}</p></section>}
                    <div className="ticket-list">{list.data.items.map((ticket) => <article className="ticket-card" key={ticket.id}>
                        <div className="ticket-card-top"><span className="ticket-eyebrow">{ticket.ticketNumber}</span><span className={`ticket-badge severity-${ticket.severity}`}>Severity {ticket.severity}</span></div>
                        <h2><button type="button" className="ticket-title-button" onClick={() => { setSelectedId(ticket.id); setNotice('') }}>{ticket.subject}</button></h2>
                        <div className="ticket-actions"><span className={`ticket-badge is-${ticket.status.toLowerCase()}`}>{ticketLabel(ticket.status)}</span><span>{ticketLabel(ticket.category)}</span></div>
                        <p className="ticket-muted">Assigned: {ticket.assigneeGlobalId ? support.data.assignees.find((admin) => admin.globalId === ticket.assigneeGlobalId)?.userName || `Admin #${ticket.assigneeGlobalId}` : 'Unassigned'}</p>
                        <p className="ticket-muted">{ticket.latestCommentAuthorGlobalId ? `Last comment: User #${ticket.latestCommentAuthorGlobalId} - ${formatTicketDate(ticket.latestCommentAt)}` : 'No comments yet'}</p>
                        <p className="ticket-muted">{ticket.attachmentCount} attachment{ticket.attachmentCount === 1 ? '' : 's'}{ticket.attachmentPreviews?.some((preview) => preview.width && preview.height) ? ' - image evidence available in details' : ''} &middot; Updated {formatTicketDate(ticket.updatedAt)}</p>
                        <RentalReportSummary report={ticket.rentalReport} />
                    </article>)}</div>
                    <nav className="ticket-pagination" aria-label="Ticket pages">
                        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                        <span>{list.data.totalPages ? `Page ${list.data.page + 1} of ${list.data.totalPages}` : 'No pages'}</span>
                        <button type="button" disabled={page + 1 >= list.data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                    </nav>
                </>}
            </>)}
        </main>
    )
}
