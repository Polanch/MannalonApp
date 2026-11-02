import { API_ORIGIN } from './farmerApi.js'

export const TICKET_CATEGORIES = ['LOGIN_ISSUE', 'ACCOUNT_ISSUE', 'REPORT_VIOLATION', 'PROGRAM_ISSUE', 'REGISTRATION_ISSUE']
export const TICKET_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CANCELLED']
export const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.txt,.csv'
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
export const TICKET_POLL_MS = 15000

export function ticketLabel(value) {
    return value ? String(value).toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) : 'Unassigned'
}

export function isTicketClosed(status) {
    return status === 'RESOLVED' || status === 'CANCELLED'
}

export function parseTicketDate(value) {
    if (!value) return null
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(value)) {
        throw new Error('The backend returned an invalid ticket timestamp.')
    }
    const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`)
    if (Number.isNaN(date.getTime())) throw new Error('The backend returned an invalid ticket timestamp.')
    return date
}

export function formatTicketDate(value) {
    const date = parseTicketDate(value)
    return date ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium', timeStyle: 'short',
    }).format(date) : 'Not yet'
}

export function ticketDateFilter(value) {
    if (!value) return undefined
    parseTicketDate(value)
    return value.length === 16 ? `${value}:00` : value
}

export function validateTicketFiles(files) {
    if (files.length > 5) throw new Error('Choose at most 5 attachments per request.')
    for (const file of files) {
        const extension = file.name.split('.').pop().toLowerCase()
        if (!ATTACHMENT_ACCEPT.split(',').includes(`.${extension}`)) {
            throw new Error(`${file.name}: choose JPG, JPEG, PNG, WebP, PDF, TXT, or CSV.`)
        }
        if (file.size === 0) throw new Error(`${file.name}: empty attachments are not supported.`)
        if (file.size > MAX_ATTACHMENT_SIZE) throw new Error(`${file.name}: maximum file size is 10 MB (10 MiB).`)
    }
}

function multipart(details, files) {
    validateTicketFiles(files)
    const form = new FormData()
    form.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }))
    files.forEach((file) => form.append('attachments', file))
    return form
}

export class TicketApiError extends Error {
    constructor(status, message) {
        super(message)
        this.name = 'TicketApiError'
        this.status = status
    }
}

async function request(path, { method = 'GET', body, signal, blob = false } = {}) {
    const response = await fetch(`${API_ORIGIN}${path}`, {
        method, credentials: 'include',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
        headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    })
    if (!response.ok) {
        const text = await response.text()
        let detail = ''
        if (text && !text.trimStart().startsWith('<')) {
            try {
                const data = JSON.parse(text)
                detail = data.errors ? Object.values(data.errors).flat().join(' ') : data.message || data.detail || data.error || ''
            } catch {
                detail = text
            }
        }
        const prefix = {
            400: 'Validation failed.',
            401: 'Your session expired. Please sign in again.',
            403: 'Permission denied.',
            404: 'The ticket or ticketing endpoint is unavailable.',
            409: 'Conflict: this record changed or the requested transition is not allowed. Refresh and review before retrying.',
            413: 'Attachments exceed the server upload limit.',
        }[response.status] || 'Ticketing request failed.'
        throw new TicketApiError(response.status, `${prefix}${detail ? ` ${detail}` : ''}`)
    }
    return blob ? response.blob() : response.json()
}

function queryString(query) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    })
    return params.toString()
}

function requirePage(data) {
    if (!data || !Array.isArray(data.items) || !Number.isInteger(data.page)
        || !Number.isInteger(data.size) || !Number.isInteger(data.totalPages) || !Number.isInteger(data.totalElements)) {
        throw new Error('The backend ticket pagination response is invalid.')
    }
    return data
}

function requireSummary(ticket) {
    if (!ticket || !Number.isInteger(ticket.id) || !Number.isInteger(ticket.version)
        || !TICKET_STATUSES.includes(ticket.status) || !TICKET_CATEGORIES.includes(ticket.category)
        || ![1, 2, 3].includes(ticket.severity) || typeof ticket.subject !== 'string') {
        throw new Error('The backend ticket summary response is invalid.')
    }
    for (const key of ['createdAt', 'updatedAt', 'closedAt', 'latestCommentAt']) parseTicketDate(ticket[key])
    if (ticket.rentalReport) {
        for (const key of ['graceDeadlineAt', 'escalatedAt', 'settledAt']) parseTicketDate(ticket.rentalReport[key])
    }
    return ticket
}

function requireDetail(data) {
    if (!data?.ticket || !Number.isInteger(data.ticket.id) || !Number.isInteger(data.ticket.version)
        || !TICKET_STATUSES.includes(data.ticket.status) || !Array.isArray(data.attachments)) {
        throw new Error('The backend ticket detail response is invalid.')
    }
    requireSummary(data.ticket)
    return data
}

export async function fetchTicketSession(signal) {
    const data = await request('/api/auth/session', { signal })
    if (!Number.isInteger(data?.globalId) || typeof data.role !== 'string') {
        throw new Error('The backend did not return a valid session identity.')
    }
    return data
}

export async function fetchTicketCategories(signal) {
    const data = await request('/api/tickets/categories', { signal })
    if (!Array.isArray(data) || data.length === 0 || data.some((item) => !TICKET_CATEGORIES.includes(item))) {
        throw new Error('The backend ticket categories response is invalid.')
    }
    return data
}

export async function fetchTickets(query, signal) {
    const data = requirePage(await request(`/api/tickets?${queryString(query)}`, { signal }))
    data.items.forEach(requireSummary)
    return data
}

export async function fetchTicket(id, signal) {
    return requireDetail(await request(`/api/tickets/${id}`, { signal }))
}

export async function fetchTicketComments(id, page, signal) {
    return requirePage(await request(`/api/tickets/${id}/comments?${queryString({ page, size: 20 })}`, { signal }))
}

export async function fetchTicketHistory(id, page, signal) {
    return requirePage(await request(`/api/tickets/${id}/history?${queryString({ page, size: 20 })}`, { signal }))
}

export async function createTicket(details, files = []) {
    return requireDetail(await request('/api/tickets', { method: 'POST', body: multipart({
        subject: details.subject, description: details.description, category: details.category, linkedBookingId: null,
    }, files) }))
}

export async function createRentalReport(bookingId, details, files = []) {
    return requireDetail(await request(`/api/rentals/bookings/${bookingId}/reports`, {
        method: 'POST', body: multipart({
            reportType: details.reportType, subject: details.subject, description: details.description,
        }, files),
    }))
}

export function addTicketComment(id, comment, files = []) {
    return request(`/api/tickets/${id}/comments`, { method: 'POST', body: multipart({ comment }, files) })
}

export async function updateTicketAssignment(id, assigneeGlobalId, expectedVersion) {
    return requireDetail(await request(`/api/admin/tickets/${id}/assignment`, {
        method: 'PUT', body: { assigneeGlobalId, expectedVersion },
    }))
}

export async function updateTicketSeverity(id, severity, expectedVersion) {
    return requireDetail(await request(`/api/admin/tickets/${id}/severity`, {
        method: 'PUT', body: { severity, expectedVersion },
    }))
}

export async function updateTicketStatus(id, fields) {
    return requireDetail(await request(`/api/admin/tickets/${id}/status`, {
        method: 'PUT', body: {
            status: fields.status, onHoldReason: fields.onHoldReason || null,
            resolutionReport: fields.resolutionReport || null, expectedVersion: fields.expectedVersion,
        },
    }))
}

export function settlementVersions(ticket) {
    if (!Number.isInteger(ticket.version) || !Number.isInteger(ticket.rentalReport?.version)) return null
    return { expectedTicketVersion: ticket.version, expectedReportVersion: ticket.rentalReport.version }
}

export async function settleTicket(id, resolutionReport, versions) {
    if (!Number.isInteger(versions?.expectedTicketVersion) || !Number.isInteger(versions?.expectedReportVersion)) {
        throw new Error('Settlement is unavailable: the backend must return rentalReport.version. No version will be guessed.')
    }
    return requireDetail(await request(`/api/tickets/${id}/settlement`, {
        method: 'POST', body: { resolutionReport, ...versions },
    }))
}

export async function fetchTicketAssignees(signal) {
    const data = await request('/api/admin/tickets/assignees', { signal })
    if (!Array.isArray(data) || data.some((item) => !Number.isInteger(item.globalId))) {
        throw new Error('The backend assignees response is invalid.')
    }
    return data
}

export async function fetchTicketInsights(query, signal) {
    const data = await request(`/api/admin/tickets/insights?${queryString(query)}`, { signal })
    const groups = ['byStatus', 'byCategory', 'bySeverity', 'adminWorkload']
    const counts = ['unassignedCount', 'awaitingSettlementReports', 'escalatedUnsettledReports', 'resolvedCount', 'cancelledCount']
    if (!data || groups.some((key) => !Array.isArray(data[key]) || data[key].some((item) => typeof item.key !== 'string' || !Number.isFinite(item.count)))
        || counts.some((key) => !Number.isFinite(data[key]))
        || (data.averageResolutionHours !== null && !Number.isFinite(data.averageResolutionHours))) {
        throw new Error('The backend ticket insights response is invalid.')
    }
    return data
}

export function downloadTicketAttachment(ticketId, attachmentId, signal) {
    return request(`/api/tickets/${ticketId}/attachments/${attachmentId}`, { signal, blob: true })
}
