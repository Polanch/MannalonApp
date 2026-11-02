import { useCallback, useState } from 'react'
import useTicketResource from '../hooks/useTicketResource.js'
import {
    addTicketComment, fetchTicket, fetchTicketComments, fetchTicketHistory, formatTicketDate,
    isTicketClosed, settlementVersions, settleTicket, ticketLabel,
    updateTicketAssignment, updateTicketSeverity, updateTicketStatus,
} from '../services/ticketingApi.js'
import { RentalReportSummary, TicketAttachments, TicketFileInput } from './TicketingForms.jsx'
import Toast from './Toast.jsx'

function Pager({ data, onPage, disabled = false, label }) {
    return data && data.totalPages > 1 ? (
        <nav className="ticket-pagination" aria-label={label}>
            <button type="button" disabled={disabled || data.page === 0} onClick={() => onPage(data.page - 1)}>Previous</button>
            <span>Page {data.page + 1} of {data.totalPages}</span>
            <button type="button" disabled={disabled || data.page + 1 >= data.totalPages} onClick={() => onPage(data.page + 1)}>Next</button>
        </nav>
    ) : null
}

function AdminTicketActions({ ticket, assignees, disabled, onUpdated }) {
    const [draft, setDraft] = useState(() => ({
        assignee: ticket.assigneeGlobalId || '', severity: ticket.severity,
        status: ticket.status === 'OPEN' ? 'CANCELLED' : 'IN_PROGRESS',
        onHoldReason: '', resolutionReport: '', expectedVersion: ticket.version,
    }))
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const stale = draft.expectedVersion !== ticket.version
    const locked = disabled || busy || stale || isTicketClosed(ticket.status)
    const statuses = ticket.status === 'OPEN' ? ['CANCELLED'] : ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CANCELLED']

    function reset(updated = ticket) {
        setDraft({
            assignee: updated.assigneeGlobalId || '', severity: updated.severity,
            status: updated.status === 'OPEN' ? 'CANCELLED' : 'IN_PROGRESS',
            onHoldReason: '', resolutionReport: '', expectedVersion: updated.version,
        })
        setError('')
    }

    async function perform(action) {
        setBusy(true)
        setError('')
        try {
            const updated = await action()
            reset(updated.ticket)
            onUpdated('Ticket updated.')
        } catch (failure) {
            setError(failure.message || 'Unable to update this ticket.')
            if (failure.status === 409) onUpdated('')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="ticket-panel">
            <h3>Admin controls</h3>
            <p className="ticket-muted">Severity 1 is highest; new tickets start at 3. Assignment changes are saved separately.</p>
            {stale && <p className="ticket-warning" role="alert">This ticket changed since you began editing. Review the latest details, then reset the form. Your draft has not been submitted.</p>}
            <button type="button" disabled={busy || disabled} onClick={() => reset()}>Reset to latest version ({ticket.version})</button>
            {error && <p className="ticket-error" role="alert">{error}</p>}
            <div className="ticket-admin-grid">
                <form onSubmit={(event) => {
                    event.preventDefault()
                    perform(() => updateTicketAssignment(ticket.id, Number(draft.assignee), draft.expectedVersion))
                }}>
                    <fieldset disabled={locked}>
                        <label>Assign to Admin<select required value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })}>
                            <option value="">Select an Admin</option>
                            {assignees.map((admin) => <option key={admin.globalId} value={admin.globalId}>{admin.userName || admin.userId} (#{admin.globalId})</option>)}
                        </select></label>
                        <button type="submit">Save assignment</button>
                    </fieldset>
                </form>
                <form onSubmit={(event) => {
                    event.preventDefault()
                    perform(() => updateTicketSeverity(ticket.id, Number(draft.severity), draft.expectedVersion))
                }}>
                    <fieldset disabled={locked}>
                        <label>Severity<select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value })}>
                            <option value="1">1 - Highest</option><option value="2">2 - Medium</option><option value="3">3 - Standard</option>
                        </select></label>
                        <button type="submit">Save severity</button>
                    </fieldset>
                </form>
            </div>
            <form onSubmit={(event) => {
                event.preventDefault()
                if (draft.status === 'ON_HOLD' && !draft.onHoldReason.trim()) { setError('Enter an on-hold reason.'); return }
                if (isTicketClosed(draft.status) && !draft.resolutionReport.trim()) { setError('Enter a closing resolution report.'); return }
                perform(() => updateTicketStatus(ticket.id, {
                    status: draft.status, expectedVersion: draft.expectedVersion,
                    onHoldReason: draft.status === 'ON_HOLD' ? draft.onHoldReason.trim() : null,
                    resolutionReport: isTicketClosed(draft.status) ? draft.resolutionReport.trim() : null,
                }))
            }}>
                <fieldset disabled={locked}>
                    <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                        {statuses.map((status) => <option key={status} value={status} disabled={['ASSIGNED', 'IN_PROGRESS'].includes(status) && !ticket.assigneeGlobalId}>{ticketLabel(status)}</option>)}
                    </select></label>
                    {ticket.status === 'OPEN' && <p>Assign an Admin first to start work. An unassigned ticket can only be cancelled.</p>}
                    {draft.status === 'ON_HOLD' && <label>On-hold reason<textarea required maxLength={6000} rows={3} value={draft.onHoldReason} onChange={(event) => setDraft({ ...draft, onHoldReason: event.target.value })} /></label>}
                    {isTicketClosed(draft.status) && <label>Closing resolution report<textarea required maxLength={6000} rows={3} value={draft.resolutionReport} onChange={(event) => setDraft({ ...draft, resolutionReport: event.target.value })} /></label>}
                    {ticket.rentalReport?.status === 'OPEN' && isTicketClosed(draft.status) && <p className="ticket-warning">Closing with this status action cancels the linked rental report. Use Confirm settlement below to record an actual settlement instead.</p>}
                    <button className="ticket-primary" type="submit">Save status</button>
                </fieldset>
            </form>
        </section>
    )
}

function TicketSettlement({ ticket, disabled, onUpdated }) {
    const [report, setReport] = useState('')
    const [versions, setVersions] = useState(() => settlementVersions(ticket))
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const latest = settlementVersions(ticket)
    const stale = versions && latest && (versions.expectedTicketVersion !== latest.expectedTicketVersion || versions.expectedReportVersion !== latest.expectedReportVersion)

    return (
        <section className="ticket-panel">
            <h3>Confirm rental settlement</h3>
            <p>Only the reporting owner or Admin can settle the case. This resolves the ticket and stops future escalation.</p>
            {!latest && <p className="ticket-warning" role="alert">Settlement is unavailable because the backend does not return rentalReport.version. Ask backend Copilot to add it to ticket detail responses; the frontend will not guess a version.</p>}
            {stale && <p className="ticket-warning" role="alert">The ticket or report changed. Review the latest details and reset before submitting.</p>}
            {latest && <button type="button" disabled={busy || disabled} onClick={() => { setVersions(latest); setError('') }}>Reset settlement to latest version</button>}
            <form onSubmit={async (event) => {
                event.preventDefault()
                setBusy(true)
                setError('')
                try {
                    if (!report.trim()) throw new Error('Enter a settlement resolution report.')
                    await settleTicket(ticket.id, report.trim(), versions)
                    onUpdated('Rental report settled.')
                } catch (failure) {
                    setError(failure.message || 'Unable to settle this report.')
                    if (failure.status === 409) onUpdated('')
                } finally {
                    setBusy(false)
                }
            }}>
                <fieldset disabled={disabled || busy || !versions || !latest || stale || isTicketClosed(ticket.status)}>
                    <label>Settlement resolution report<textarea required maxLength={6000} rows={3} value={report} onChange={(event) => setReport(event.target.value)} /></label>
                    <button className="ticket-primary" type="submit">{busy ? 'Settling...' : 'Confirm settlement'}</button>
                </fieldset>
                {error && <p className="ticket-error" role="alert">{error}</p>}
            </form>
        </section>
    )
}

export default function TicketDetail({ id, session, assignees, adminMode, onClose, onChanged }) {
    const [commentPage, setCommentPage] = useState(0)
    const [historyPage, setHistoryPage] = useState(0)
    const [comment, setComment] = useState('')
    const [files, setFiles] = useState([])
    const [fileRevision, setFileRevision] = useState(0)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const loadDetail = useCallback((signal) => fetchTicket(id, signal), [id])
    const loadComments = useCallback((signal) => fetchTicketComments(id, commentPage, signal), [id, commentPage])
    const loadHistory = useCallback((signal) => fetchTicketHistory(id, historyPage, signal), [id, historyPage])
    const detail = useTicketResource(loadDetail)
    const comments = useTicketResource(loadComments)
    const history = useTicketResource(loadHistory)
    const ticket = detail.data?.ticket
    const closed = ticket && isTicketClosed(ticket.status)
    const locked = !ticket || closed || busy || Boolean(detail.error) || detail.loading

    function updated(message) {
        setNotice(message)
        detail.refresh()
        comments.refresh()
        history.refresh()
        onChanged(message)
    }

    async function submitComment(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            if (!comment.trim()) throw new Error('Enter a comment.')
            await addTicketComment(id, comment.trim(), files)
            setComment('')
            setFiles([])
            setFileRevision((current) => current + 1)
            updated('Comment added.')
        } catch (failure) {
            setError(failure.message || 'Unable to add your comment.')
            if (failure.status === 409) updated('')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="ticket-detail" aria-label="Ticket details">
            <div className="ticket-actions"><button type="button" onClick={onClose}>Back to tickets</button><button type="button" onClick={() => updated('')}>Refresh details</button></div>
            {detail.error && <p className="ticket-error" role="alert">{detail.error} Details may be out of date. Actions are disabled until refresh succeeds.</p>}
            {detail.loading && <p role="status">Loading ticket details...</p>}
            <Toast message={notice} onDismiss={() => setNotice('')} />
            {ticket && <>
                <header className="ticket-detail-header">
                    <p className="ticket-eyebrow">{ticket.ticketNumber}</p><h2>{ticket.subject}</h2>
                    <div className="ticket-actions"><span className={`ticket-badge is-${ticket.status.toLowerCase()}`}>{ticketLabel(ticket.status)}</span><span className={`ticket-badge severity-${ticket.severity}`}>Severity {ticket.severity}</span></div>
                </header>
                <dl className="ticket-metadata">
                    <div><dt>Category</dt><dd>{ticketLabel(ticket.category)}</dd></div>
                    <div><dt>Created by</dt><dd>User #{ticket.creatorGlobalId}</dd></div>
                    <div><dt>Assigned to</dt><dd>{ticket.assigneeGlobalId ? assignees.find((admin) => admin.globalId === ticket.assigneeGlobalId)?.userName || `Admin #${ticket.assigneeGlobalId}` : 'Unassigned'}</dd></div>
                    <div><dt>Created</dt><dd>{formatTicketDate(ticket.createdAt)}</dd></div>
                    <div><dt>Last updated</dt><dd>{formatTicketDate(ticket.updatedAt)}</dd></div>
                    <div><dt>Latest comment</dt><dd>{ticket.latestCommentAuthorGlobalId ? `User #${ticket.latestCommentAuthorGlobalId} - ${formatTicketDate(ticket.latestCommentAt)}` : 'No comments yet'}</dd></div>
                    {closed && <div><dt>Closed</dt><dd>{formatTicketDate(ticket.closedAt)}</dd></div>}
                </dl>
                <section className="ticket-panel"><h3>Description</h3><p className="ticket-prose">{detail.data.description}</p></section>
                {detail.data.onHoldReason && <section className="ticket-panel"><h3>On-hold reason</h3><p className="ticket-prose">{detail.data.onHoldReason}</p></section>}
                {detail.data.resolutionReport && <section className="ticket-panel"><h3>Resolution report</h3><p className="ticket-prose">{detail.data.resolutionReport}</p></section>}
                <RentalReportSummary report={ticket.rentalReport} />
                <section className="ticket-panel"><h3>Attachments ({ticket.attachmentCount})</h3>
                    {detail.data.attachments.length ? <TicketAttachments ticketId={id} attachments={detail.data.attachments} /> : <p>No attachments.</p>}
                </section>
                {closed ? <p className="ticket-warning">This ticket is closed and read-only.</p> : <>
                    {adminMode && <AdminTicketActions ticket={ticket} assignees={assignees} disabled={locked} onUpdated={updated} />}
                    {ticket.rentalReport?.status === 'OPEN' && (adminMode || session.globalId === ticket.creatorGlobalId) && <TicketSettlement ticket={ticket} disabled={locked} onUpdated={updated} />}
                </>}
                <section className="ticket-panel">
                    <h3>Discussion</h3>
                    {comments.error && <p className="ticket-error" role="alert">{comments.error}</p>}
                    {comments.loading && <p role="status">Loading comments...</p>}
                    {comments.data?.items.length === 0 && <p>No comments yet.</p>}
                    {comments.data?.items.map((entry) => <article className="ticket-comment" key={entry.id}>
                        <strong>User #{entry.authorGlobalId}</strong><small>{formatTicketDate(entry.createdAt)}</small>
                        <p className="ticket-prose">{entry.comment}</p><TicketAttachments ticketId={id} attachments={entry.attachments} />
                    </article>)}
                    <Pager data={comments.data} onPage={setCommentPage} disabled={comments.loading} label="Comment pages" />
                    <form onSubmit={submitComment}>
                        <fieldset disabled={locked}>
                            <label>Add a comment<textarea required maxLength={4000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
                            <TicketFileInput key={fileRevision} files={files} onChange={setFiles} disabled={locked} />
                            <button className="ticket-primary" type="submit">{busy ? 'Sending...' : 'Post comment'}</button>
                        </fieldset>
                        {error && <p className="ticket-error" role="alert">{error}</p>}
                    </form>
                </section>
                <section className="ticket-panel">
                    <h3>Activity history</h3>
                    {history.error && <p className="ticket-error" role="alert">{history.error}</p>}
                    {history.loading && <p role="status">Loading history...</p>}
                    {history.data?.items.length === 0 && <p>No activity yet.</p>}
                    <ol className="ticket-history">{history.data?.items.map((entry) => <li key={entry.id}>
                        <strong>{ticketLabel(entry.eventType)}</strong><small>{entry.actorGlobalId ? `User #${entry.actorGlobalId}` : 'System'} &middot; {formatTicketDate(entry.createdAt)}</small>
                        <p className="ticket-prose">{entry.detail}</p>
                        {(entry.previousValue || entry.newValue) && <p>{entry.previousValue || 'None'} &rarr; {entry.newValue || 'None'}</p>}
                    </li>)}</ol>
                    <Pager data={history.data} onPage={setHistoryPage} disabled={history.loading} label="History pages" />
                </section>
            </>}
        </section>
    )
}
