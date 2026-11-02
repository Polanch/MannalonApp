import { useEffect, useState } from 'react'
import {
    ATTACHMENT_ACCEPT, createRentalReport, createTicket, downloadTicketAttachment,
    formatTicketDate, ticketLabel, validateTicketFiles,
} from '../services/ticketingApi.js'

export function TicketFileInput({ files, onChange, disabled = false }) {
    const [error, setError] = useState('')
    return (
        <div className="ticket-file-input">
            <label>Attachments
                <input type="file" multiple accept={ATTACHMENT_ACCEPT} disabled={disabled} onChange={(event) => {
                    const selected = Array.from(event.target.files)
                    try {
                        validateTicketFiles(selected)
                        setError('')
                        onChange(selected)
                    } catch (failure) {
                        setError(failure.message)
                        event.target.value = ''
                        onChange([])
                    }
                }} />
            </label>
            <small>Up to 5 files, 10 MB (10 MiB) each. JPG, JPEG, PNG, WebP, PDF, TXT, CSV. Files are private.</small>
            {files.length > 0 && <ul>{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name} ({Math.ceil(file.size / 1024)} KB)</li>)}</ul>}
            {error && <p className="ticket-error" role="alert">{error}</p>}
        </div>
    )
}

export function TicketCreateForm({ categories, booking, onCreated, onCancel, onSubmittingChange }) {
    const [fields, setFields] = useState({
        subject: '', description: '', category: categories?.[0] || 'LOGIN_ISSUE',
        reportType: booking?.overdue && booking.status === 'ACTIVE' ? 'NON_RETURN' : 'RULE_VIOLATION',
    })
    const [files, setFiles] = useState([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    async function submit(event) {
        event.preventDefault()
        setError('')
        setBusy(true)
        onSubmittingChange?.(true)
        try {
            if (!fields.subject.trim() || !fields.description.trim()) throw new Error('Subject and description are required.')
            const details = { ...fields, subject: fields.subject.trim(), description: fields.description.trim() }
            const created = booking
                ? await createRentalReport(booking.bookingId, details, files)
                : await createTicket(details, files)
            onCreated(created)
        } catch (failure) {
            setError(failure.message || 'Unable to submit your ticket. Check your connection.')
        } finally {
            setBusy(false)
            onSubmittingChange?.(false)
        }
    }

    return (
        <section className="ticket-panel ticket-create">
            <h2>{booking ? 'Report this rental' : 'Create a ticket'}</h2>
            {booking && <p>Booking #{booking.bookingId} &middot; {booking.item.name}. Non-return grace ends seven days after the original due time. Rule-violation grace ends seven days after reporting. The backend handles escalation.</p>}
            <form onSubmit={submit}>
                <fieldset disabled={busy}>
                    {booking ? <label>Report type<select value={fields.reportType} onChange={(event) => setFields({ ...fields, reportType: event.target.value })}>
                        <option value="RULE_VIOLATION">Rule violation</option>
                        <option value="NON_RETURN" disabled={!booking.overdue || booking.status !== 'ACTIVE'}>Item not returned (active overdue rentals only)</option>
                    </select></label> : <label>Category<select value={fields.category} onChange={(event) => setFields({ ...fields, category: event.target.value })}>
                        {categories.map((category) => <option key={category} value={category}>{ticketLabel(category)}</option>)}
                    </select></label>}
                    <label>Subject<input required maxLength={200} value={fields.subject} onChange={(event) => setFields({ ...fields, subject: event.target.value })} /></label>
                    <label>Description<textarea required rows={5} maxLength={6000} value={fields.description} onChange={(event) => setFields({ ...fields, description: event.target.value })} /></label>
                    <TicketFileInput files={files} onChange={setFiles} disabled={busy} />
                </fieldset>
                {error && <p className="ticket-error" role="alert">{error}</p>}
                <div className="ticket-actions">
                    <button className="ticket-primary" disabled={busy} type="submit">{busy ? 'Submitting...' : booking ? 'Submit rental report' : 'Submit ticket'}</button>
                    <button disabled={busy} type="button" onClick={onCancel}>Cancel</button>
                </div>
            </form>
        </section>
    )
}

export function RentalReportSummary({ report }) {
    if (!report) return null
    return (
        <div className={`ticket-report${report.escalated && report.status === 'OPEN' ? ' is-escalated' : ''}`}>
            <strong>{ticketLabel(report.reportType)} &middot; {ticketLabel(report.status)}</strong>
            <p>Grace deadline: {formatTicketDate(report.graceDeadlineAt)} (your local time)</p>
            {report.escalated && <p>Escalated to Admin: {formatTicketDate(report.escalatedAt)}</p>}
            {report.settledAt && <p>Settled: {formatTicketDate(report.settledAt)}</p>}
        </div>
    )
}

function TicketAttachment({ ticketId, attachment }) {
    const [url, setUrl] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [retry, setRetry] = useState(0)
    const image = ['image/jpeg', 'image/png', 'image/webp'].includes(attachment.contentType)

    useEffect(() => {
        if (!image) return
        const controller = new AbortController()
        let objectUrl
        async function load() {
            try {
                const blob = await downloadTicketAttachment(ticketId, attachment.id, controller.signal)
                if (!controller.signal.aborted) {
                    objectUrl = URL.createObjectURL(blob)
                    setUrl(objectUrl)
                    setError('')
                }
            } catch (failure) {
                if (!controller.signal.aborted) setError(failure.message || 'Unable to load the attachment preview.')
            }
        }
        load()
        return () => {
            controller.abort()
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [image, ticketId, attachment.id, retry])

    async function download() {
        setBusy(true)
        setError('')
        try {
            const blob = await downloadTicketAttachment(ticketId, attachment.id)
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = attachment.originalFilename
            link.click()
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
        } catch (failure) {
            setError(failure.message || 'Unable to download the attachment.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <li className="ticket-attachment">
            {image && (url ? <img src={url} alt={attachment.originalFilename} loading="lazy" onError={() => setError('This attachment could not be displayed as an image. Try downloading it.')} /> : <span>Loading preview...</span>)}
            <strong>{attachment.originalFilename}</strong>
            <small>{Math.ceil(attachment.fileSize / 1024)} KB &middot; Uploaded by User #{attachment.uploaderGlobalId} &middot; {formatTicketDate(attachment.uploadedAt)}</small>
            <button type="button" disabled={busy} onClick={download}>{busy ? 'Downloading...' : 'Download'}</button>
            {error && <><p className="ticket-error" role="alert">{error}</p>{image && <button type="button" onClick={() => setRetry((current) => current + 1)}>Retry preview</button>}</>}
        </li>
    )
}

export function TicketAttachments({ ticketId, attachments }) {
    if (!attachments?.length) return null
    return <ul className="ticket-attachments">{attachments.map((attachment) => <TicketAttachment key={attachment.id} ticketId={ticketId} attachment={attachment} />)}</ul>
}
