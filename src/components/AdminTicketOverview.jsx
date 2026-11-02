import { TICKET_STATUSES, ticketLabel } from '../services/ticketingApi.js'

export default function AdminTicketOverview({ resource, onOpenTickets }) {
    const { data, error, loading, refresh } = resource
    const counts = data ? Object.fromEntries(data.byStatus.map(({ key, count }) => [key, count])) : null
    const ongoing = counts ? ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].reduce((total, status) => total + counts[status], 0) : null

    return (
        <section className="admin-ticket-overview" aria-labelledby="admin-ticket-overview-title">
            <header className="admin-ticket-overview-header">
                <div>
                    <p className="admin-eyebrow">SUPPORT MONITOR</p>
                    <h3 id="admin-ticket-overview-title">Ticket status</h3>
                    <p>All-time ticket counts. Refreshes every 15 seconds while this dashboard is open.</p>
                </div>
                <div className="admin-ticket-overview-actions">
                    <button type="button" onClick={refresh} disabled={loading}>Refresh tickets</button>
                    <button type="button" onClick={onOpenTickets}>Manage tickets</button>
                </div>
            </header>
            {error && <p className="admin-ticket-overview-error" role="alert">{error} {data ? 'Showing the last successful counts; they may be out of date.' : 'Ticket counts are unavailable.'}</p>}
            {loading && <p role="status">Loading ticket counts...</p>}
            <div className="admin-ticket-summary">
                <article className="admin-ticket-ongoing">
                    <span className="admin-stat-value">{ongoing ?? '-'}</span>
                    <h4>Ongoing tickets</h4>
                    <p>Open, assigned, in progress, and on hold. Resolved and cancelled tickets are excluded.</p>
                </article>
                <dl className="admin-ticket-status-grid">
                    {TICKET_STATUSES.map((status) => <div key={status} className={`admin-ticket-status is-${status.toLowerCase()}`}>
                        <dt>{ticketLabel(status)}</dt><dd>{counts?.[status] ?? '-'}</dd>
                    </div>)}
                </dl>
            </div>
        </section>
    )
}
