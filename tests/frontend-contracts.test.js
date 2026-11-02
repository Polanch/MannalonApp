import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server
let ChatbotAnswer
let registryApi
let FarmerChatbot
let ticketApi
let TicketCreateForm
let RentalReportSummary
let AdminTicketOverview
let branchesApi

before(async () => {
    server = await createServer({
        server: { middlewareMode: true, watch: null },
        appType: 'custom',
    })
    ChatbotAnswer = (await server.ssrLoadModule('/src/components/ChatbotAnswer.jsx')).default
    registryApi = await server.ssrLoadModule('/src/services/rsbsaRegistryApi.js')
    FarmerChatbot = (await server.ssrLoadModule('/src/components/farmer_components/FarmerChatbot.jsx')).default
    ticketApi = await server.ssrLoadModule('/src/services/ticketingApi.js')
    const forms = await server.ssrLoadModule('/src/components/TicketingForms.jsx')
    TicketCreateForm = forms.TicketCreateForm
    RentalReportSummary = forms.RentalReportSummary
    AdminTicketOverview = (await server.ssrLoadModule('/src/components/AdminTicketOverview.jsx')).default
    branchesApi = await server.ssrLoadModule('/src/services/farmBranchesApi.js')
})

after(async () => {
    await server?.close()
})

const sourceUrl = 'https://knowledgebank.irri.org/water'
test('branch owner lookup is session-scoped to the chosen main farm', async (context) => {
    const owners = [{ globalId: 101, fullName: 'Synthetic Farmer' }]
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(new URL(url).pathname, '/api/farm-admin/farms/4/branch-owners')
        assert.equal(options.credentials, 'include')
        return Response.json(owners)
    })
    assert.deepEqual(await branchesApi.fetchBranchOwners(4), owners)
})

test('branch submission preserves documents and selected ownership without creating a new farm code', async (context) => {
    const parent = { farmId: 4, farmCode: 'FARM-0004', status: 'APPROVED' }
    const response = {
        registrationId: 9, parentFarmId: 4, ownerGlobalId: 101, farmCode: 'FARM-0004', status: 'PENDING',
    }
    const form = new FormData()
    form.append('farmName', 'Second parcel')
    form.append('areaHectares', '2.5')
    form.append('documents[0].documentType', 'Tax Declaration')
    form.append('documents[0].file', new File(['evidence'], 'evidence.txt'))
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(new URL(url).pathname, '/api/farm-admin/farms/4/branch-registrations')
        assert.equal(options.method, 'POST')
        assert.equal(options.credentials, 'include')
        assert.ok(options.body instanceof FormData)
        assert.equal(options.body.get('farmName'), 'Second parcel')
        assert.equal(options.body.get('ownerGlobalId'), '101')
        assert.equal(options.body.get('documents[0].file').name, 'evidence.txt')
        assert.equal(options.body.has('farmCode'), false)
        assert.equal(options.body.has('actorGlobalId'), false)
        return Response.json(response, { status: 201 })
    })
    assert.deepEqual(await branchesApi.submitBranchRegistration(parent, 101, form), response)
    assert.equal(form.has('ownerGlobalId'), false)
})

test('branches reject unapproved parents, nested branches, and invalid owners before posting', async (context) => {
    const fetch = context.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not submit') })
    const parent = { farmId: 4, farmCode: 'FARM-0004', status: 'APPROVED' }
    for (const invalid of [{ ...parent, status: 'PENDING' }, { ...parent, parentFarmId: 2 }, { ...parent, farmCode: null }]) {
        await assert.rejects(branchesApi.submitBranchRegistration(invalid, 101, new FormData()), /approved main farm/)
    }
    await assert.rejects(branchesApi.submitBranchRegistration(parent, 0, new FormData()), /eligible Farmer/)
    assert.equal(fetch.mock.callCount(), 0)
})

test('branch APIs surface missing backend support and reject wrong-code or wrong-owner confirmations', async (context) => {
    context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
    await assert.rejects(branchesApi.fetchBranchOwners(4), /not available on the backend/)
    const parent = { farmId: 4, farmCode: 'FARM-0004', status: 'APPROVED' }
    const valid = { registrationId: 9, parentFarmId: 4, ownerGlobalId: 101, farmCode: 'FARM-0004', status: 'PENDING' }
    for (const invalid of [{ ...valid, farmCode: 'NEW-CODE' }, { ...valid, ownerGlobalId: 102 }, { ...valid, parentFarmId: 5 }, { ...valid, status: 'APPROVED' }]) {
        globalThis.fetch.mock.mockImplementation(async () => Response.json(invalid))
        await assert.rejects(branchesApi.submitBranchRegistration(parent, 101, new FormData()), /did not confirm a pending branch/)
    }
    globalThis.fetch.mock.mockImplementation(async () => Response.json([{ fullName: 'Missing ID' }]))
    await assert.rejects(branchesApi.fetchBranchOwners(4), /invalid list/)
})

test('Admin dashboard counts all four ongoing statuses and excludes closed tickets', () => {
    const counts = { OPEN: 4, ASSIGNED: 3, IN_PROGRESS: 2, ON_HOLD: 1, RESOLVED: 20, CANCELLED: 7 }
    const html = renderToStaticMarkup(createElement(AdminTicketOverview, {
        resource: { data: { byStatus: Object.entries(counts).map(([key, count]) => ({ key, count })) }, loading: false, error: '' },
    }))
    assert.match(html, /admin-stat-value">10<\/span>/)
    for (const [status, count] of Object.entries(counts)) {
        assert.match(html, new RegExp(`<dt>${ticketApi.ticketLabel(status)}</dt><dd>${count}</dd>`))
    }
    assert.match(html, /Manage tickets/)
    assert.match(html, /All-time ticket counts/)
})

test('Admin ticket overview shows unavailable or stale counts explicitly rather than false zeroes', () => {
    const render = (resource) => renderToStaticMarkup(createElement(AdminTicketOverview, { resource }))
    const unavailable = render({ data: null, loading: false, error: 'Permission denied.' })
    assert.match(unavailable, /role="alert"/)
    assert.match(unavailable, /Ticket counts are unavailable/)
    assert.match(unavailable, /admin-stat-value">-<\/span>/)
    assert.doesNotMatch(unavailable, /<dd>0<\/dd>/)
    const data = { byStatus: ticketApi.TICKET_STATUSES.map((key) => ({ key, count: 0 })) }
    const stale = render({ data, loading: false, error: 'Network failed.' })
    assert.match(stale, /Showing the last successful counts/)
    assert.match(stale, /admin-stat-value">0<\/span>/)
    assert.match(render({ data: null, loading: true, error: '' }), /Loading ticket counts/)
})

test('chatbot controls are English and the full AI notice is behind a dialog trigger', () => {
    const html = renderToStaticMarkup(createElement(FarmerChatbot))
    assert.match(html, />New chat<\/button>/)
    assert.match(html, /aria-haspopup="dialog"[^>]*>AI usage &amp; privacy policy<\/button>/)
    assert.match(html, />Your farming question<\/label>/)
    assert.match(html, />Send<\/button>/)
    assert.match(html, /Loading your latest conversation/)
    assert.doesNotMatch(html, /<aside|<dialog|Baro a saritaan|Ipatulod/)
})

function renderAnswer(answer, sources, groundingStatus = 'IRRI_SOURCED') {
    return renderToStaticMarkup(createElement(ChatbotAnswer, {
        turn: { answer, sources, groundingStatus },
    }))
}

test('citation positions match backend UTF-16 offsets after emoji', () => {
    const answer = 'Rice 🌾 needs water [1].'
    const startIndex = answer.indexOf('[1]')
    const html = renderAnswer(answer, [{
        url: sourceUrl, title: 'Water', startIndex, endIndex: startIndex + 3,
    }])
    assert.match(html, /Rice 🌾 needs water <a[^>]*>\[1\]<\/a>\./)
    assert.doesNotMatch(html, /role="alert"/)
})

test('repeated citations render inline but source list is deduplicated', () => {
    const answer = 'Water [1]. Water again [1].'
    const sources = [answer.indexOf('[1]'), answer.lastIndexOf('[1]')].map((startIndex) => ({
        url: sourceUrl, title: 'Water', startIndex, endIndex: startIndex + 3,
    }))
    const html = renderAnswer(answer, sources)
    assert.equal((html.match(/href=/g) || []).length, 3)
    assert.equal((html.match(/<li>/g) || []).length, 1)
})

test('source-only 0,0 reference does not create an empty inline link', () => {
    const html = renderAnswer('Advice.', [{
        url: sourceUrl, title: 'Water', startIndex: 0, endIndex: 0,
    }])
    assert.match(html, /<p>Advice\.<\/p>/)
    assert.equal((html.match(/href=/g) || []).length, 1)
    assert.doesNotMatch(html, /role="alert"/)
})

test('invalid offsets preserve text and display a reference warning', () => {
    const html = renderAnswer('Advice [1].', [{
        url: sourceUrl, title: 'Water', startIndex: -1, endIndex: 100,
    }])
    assert.match(html, /<p>Advice \[1\]\.<\/p>/)
    assert.match(html, /role="alert"/)
})

test('non-IRRI and executable source URLs are not rendered as links', () => {
    for (const url of ['javascript:alert(1)', 'https://irri.org.example.com/a', 'https://example.com/a']) {
        const html = renderAnswer('Advice [1].', [{ url, startIndex: 7, endIndex: 10 }])
        assert.doesNotMatch(html, /href=/)
        assert.match(html, /role="alert"/)
    }
})

test('no-source abstention displays notice without citations or thinking text', () => {
    const html = renderAnswer('Awan ti nasarakan a pagtaudan.', [], 'NO_IRRI_SOURCE')
    assert.match(html, /No verified IRRI source found/)
    assert.doesNotMatch(html, /href=|&lt;think&gt;|<think>/)
})

test('registry search and pagination use the backend query contract', async (context) => {
    const payload = { items: [{ farmerId: 'F1', mobileNumber: '09000000000', farmArea: 0 }], total: 21, page: 1, size: 20 }
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        const parsed = new URL(url)
        assert.equal(parsed.pathname, '/api/rsbsa-registry')
        assert.equal(parsed.searchParams.get('search'), 'Rice & water')
        assert.equal(parsed.searchParams.get('page'), '1')
        assert.equal(parsed.searchParams.get('size'), '20')
        assert.equal(options.credentials, 'include')
        return Response.json(payload)
    })
    assert.deepEqual(await registryApi.fetchRsbsaRegistry({ search: 'Rice & water', page: 1, size: 20 }), payload)
})

test('registry import sends multipart file and preserves all row errors', async (context) => {
    const errors = Array.from({ length: 7 }, (_, index) => ({
        rowNumber: index + 2, farmerId: `F${index}`, message: 'Invalid row',
    }))
    const payload = { importedCount: 2, updatedCount: 1, skippedCount: 7, errors }
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(new URL(url).pathname, '/api/admin/rsbsa-registry/import')
        assert.equal(options.method, 'POST')
        assert.equal(options.credentials, 'include')
        assert.ok(options.body instanceof FormData)
        assert.equal(options.body.get('file').name, 'records.csv')
        return Response.json(payload)
    })
    const file = new File(['Farmer ID'], 'records.csv', { type: 'text/csv' })
    assert.deepEqual(await registryApi.importRsbsaRegistry(file), payload)
})

test('backend import errors are surfaced rather than treated as success', async (context) => {
    context.mock.method(globalThis, 'fetch', async () =>
        Response.json({ message: 'Could not locate expected RSBSA registry headers' }, { status: 400 }))
    await assert.rejects(registryApi.importRsbsaRegistry(new File(['bad'], 'bad.csv')), /expected RSBSA registry headers/)
})

test('invalid registry and import response shapes produce explicit errors', async (context) => {
    context.mock.method(globalThis, 'fetch', async () => Response.json({ items: [], total: '21' }))
    await assert.rejects(registryApi.fetchRsbsaRegistry({ search: '', page: 0, size: 20 }), /response is invalid/)
    globalThis.fetch.mock.mockImplementation(async () => Response.json({ importedCount: 1 }))
    await assert.rejects(registryApi.importRsbsaRegistry(new File(['x'], 'records.csv')), /response is invalid/)
})

const ticketSummary = {
    id: 1, ticketNumber: 'TKT-0000001', subject: 'Cannot login', category: 'LOGIN_ISSUE',
    severity: 3, status: 'OPEN', creatorGlobalId: 101, assigneeGlobalId: null,
    createdAt: '2026-11-01T12:00:00', updatedAt: '2026-11-01T12:00:00',
    closedAt: null, latestCommentAt: null, attachmentCount: 0, version: 2,
}
const ticketDetail = { ticket: ticketSummary, description: 'OTP not arriving', attachments: [] }

test('ticket timestamps without offsets are interpreted as UTC, including fractional seconds', () => {
    assert.equal(ticketApi.parseTicketDate('2026-11-01T12:00:00').toISOString(), '2026-11-01T12:00:00.000Z')
    assert.equal(ticketApi.parseTicketDate('2026-11-01T12:00:00.123456').toISOString(), '2026-11-01T12:00:00.123Z')
    assert.equal(ticketApi.parseTicketDate('2026-11-01T20:00:00+08:00').toISOString(), '2026-11-01T12:00:00.000Z')
    assert.equal(ticketApi.ticketDateFilter('2026-11-01T12:00'), '2026-11-01T12:00:00')
    assert.equal(ticketApi.ticketDateFilter(''), undefined)
    assert.throws(() => ticketApi.parseTicketDate('invalid'), /invalid ticket timestamp/)
    assert.equal(ticketApi.TICKET_POLL_MS, 15000)
})

test('ticket attachment limits match exact server thresholds', () => {
    const exact = { name: 'photo.JPG', size: 10 * 1024 * 1024 }
    assert.doesNotThrow(() => ticketApi.validateTicketFiles(Array(5).fill(exact)))
    assert.throws(() => ticketApi.validateTicketFiles(Array(6).fill(exact)), /at most 5/)
    assert.throws(() => ticketApi.validateTicketFiles([{ ...exact, size: exact.size + 1 }]), /maximum file size/)
    assert.throws(() => ticketApi.validateTicketFiles([{ name: 'script.html', size: 1 }]), /choose JPG/)
    assert.throws(() => ticketApi.validateTicketFiles([{ name: 'empty.txt', size: 0 }]), /empty attachments/)
    for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'txt', 'csv']) {
        assert.doesNotThrow(() => ticketApi.validateTicketFiles([{ name: `file.${extension}`, size: 1 }]))
    }
})

test('ticket filters preserve false, UTC date payloads, and backend pagination', async (context) => {
    const payload = { items: [ticketSummary], page: 1, size: 20, totalPages: 2, totalElements: 21 }
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        const parsed = new URL(url)
        assert.equal(parsed.pathname, '/api/tickets')
        assert.equal(parsed.searchParams.get('escalation'), 'false')
        assert.equal(parsed.searchParams.get('from'), '2026-11-01T12:00:00')
        assert.equal(parsed.searchParams.get('search'), 'Rice & tools')
        assert.equal(parsed.searchParams.get('page'), '1')
        assert.equal(parsed.searchParams.get('assignee'), '5')
        assert.equal(parsed.searchParams.has('category'), false)
        assert.equal(options.credentials, 'include')
        assert.equal(options.cache, 'no-store')
        return Response.json(payload)
    })
    assert.deepEqual(await ticketApi.fetchTickets({
        search: 'Rice & tools', category: '', escalation: false, assignee: 5,
        from: '2026-11-01T12:00:00', page: 1, size: 20,
    }), payload)
})

test('ticket and rental creation use JSON details and repeated attachments without actor IDs', async (context) => {
    let expectedPath = '/api/tickets'
    let expectedDetails = { subject: 'Cannot login', description: 'OTP not arriving', category: 'LOGIN_ISSUE', linkedBookingId: null }
    const files = [new File(['evidence'], 'notes.txt'), new File(['a,b'], 'data.csv')]
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(new URL(url).pathname, expectedPath)
        assert.equal(options.method, 'POST')
        assert.equal(options.credentials, 'include')
        assert.equal(options.headers, undefined)
        assert.ok(options.body instanceof FormData)
        assert.equal(options.body.get('details').type, 'application/json')
        assert.deepEqual(JSON.parse(await options.body.get('details').text()), expectedDetails)
        assert.deepEqual(options.body.getAll('attachments').map((file) => file.name), ['notes.txt', 'data.csv'])
        assert.equal(options.body.has('actorGlobalId'), false)
        return Response.json(ticketDetail, { status: 201 })
    })
    await ticketApi.createTicket({ ...expectedDetails, actorGlobalId: 999, linkedBookingId: 55 }, files)
    expectedPath = '/api/rentals/bookings/8/reports'
    expectedDetails = { reportType: 'RULE_VIOLATION', subject: 'Broken tool', description: 'Damage after rental' }
    await ticketApi.createRentalReport(8, { ...expectedDetails, actorGlobalId: 999 }, files)
})

test('comment multipart and paginated comments/history match the contract', async (context) => {
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        const parsed = new URL(url)
        assert.equal(options.credentials, 'include')
        if (options.method === 'POST') {
            assert.equal(parsed.pathname, '/api/tickets/1/comments')
            assert.deepEqual(JSON.parse(await options.body.get('details').text()), { comment: 'Evidence' })
            assert.equal(options.body.getAll('attachments').length, 0)
            return Response.json({ id: 9, comment: 'Evidence', attachments: [] })
        }
        assert.match(parsed.pathname, /^\/api\/tickets\/1\/(comments|history)$/)
        assert.equal(parsed.searchParams.get('page'), '2')
        assert.equal(parsed.searchParams.get('size'), '20')
        return Response.json({ items: [], page: 2, size: 20, totalPages: 3, totalElements: 41 })
    })
    await ticketApi.addTicketComment(1, 'Evidence')
    await ticketApi.fetchTicketComments(1, 2)
    await ticketApi.fetchTicketHistory(1, 2)
})

test('admin updates and settlement carry captured optimistic-lock versions', async (context) => {
    const requests = []
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(options.credentials, 'include')
        requests.push([new URL(url).pathname, JSON.parse(options.body)])
        return Response.json(ticketDetail)
    })
    await ticketApi.updateTicketAssignment(1, 5, 2)
    await ticketApi.updateTicketSeverity(1, 1, 2)
    await ticketApi.updateTicketStatus(1, { status: 'ON_HOLD', onHoldReason: 'Documents', expectedVersion: 2 })
    await ticketApi.settleTicket(1, 'Settled', { expectedTicketVersion: 2, expectedReportVersion: 0 })
    assert.deepEqual(requests, [
        ['/api/admin/tickets/1/assignment', { assigneeGlobalId: 5, expectedVersion: 2 }],
        ['/api/admin/tickets/1/severity', { severity: 1, expectedVersion: 2 }],
        ['/api/admin/tickets/1/status', { status: 'ON_HOLD', onHoldReason: 'Documents', resolutionReport: null, expectedVersion: 2 }],
        ['/api/tickets/1/settlement', { resolutionReport: 'Settled', expectedTicketVersion: 2, expectedReportVersion: 0 }],
    ])
})

test('settlement never guesses the missing report version', async (context) => {
    const fetch = context.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not call backend') })
    assert.equal(ticketApi.settlementVersions({ ...ticketSummary, rentalReport: { reportId: 9 } }), null)
    assert.deepEqual(ticketApi.settlementVersions({ ...ticketSummary, rentalReport: { version: 0 } }), {
        expectedTicketVersion: 2, expectedReportVersion: 0,
    })
    await assert.rejects(ticketApi.settleTicket(1, 'Settled', null), /must return rentalReport.version/)
    assert.equal(fetch.mock.callCount(), 0)
})

test('settlement uses the real report version returned by ticket detail', async (context) => {
    const detail = {
        ...ticketDetail,
        ticket: {
            ...ticketSummary, version: 8,
            rentalReport: {
                reportId: 9, version: 3, reportType: 'RULE_VIOLATION', status: 'OPEN',
                graceDeadlineAt: '2026-11-08T12:00:00', escalated: false, escalatedAt: null, settledAt: null,
            },
        },
    }
    const fetch = context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(options.credentials, 'include')
        if (options.method === 'GET') {
            assert.equal(new URL(url).pathname, '/api/tickets/1')
            return Response.json(detail)
        }
        assert.equal(new URL(url).pathname, '/api/tickets/1/settlement')
        assert.equal(options.method, 'POST')
        assert.deepEqual(JSON.parse(options.body), {
            resolutionReport: 'Owner confirmed settlement', expectedTicketVersion: 8, expectedReportVersion: 3,
        })
        return Response.json({
            ...detail, ticket: {
                ...detail.ticket, status: 'RESOLVED', version: 9,
                rentalReport: { ...detail.ticket.rentalReport, status: 'SETTLED', version: 4 },
            },
        })
    })
    const loaded = await ticketApi.fetchTicket(1)
    const versions = ticketApi.settlementVersions(loaded.ticket)
    assert.deepEqual(versions, { expectedTicketVersion: 8, expectedReportVersion: 3 })
    const settled = await ticketApi.settleTicket(1, 'Owner confirmed settlement', versions)
    assert.equal(settled.ticket.status, 'RESOLVED')
    assert.equal(settled.ticket.rentalReport.version, 4)
    assert.equal(fetch.mock.callCount(), 2)
})

test('ticket errors explicitly distinguish permission, validation, and conflict failures', async (context) => {
    context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Owner only' }, { status: 403 }))
    await assert.rejects(ticketApi.fetchTicket(1), (error) => error.status === 403 && /Permission denied.*Owner only/.test(error.message))
    globalThis.fetch.mock.mockImplementation(async () => Response.json({ message: 'Stale version' }, { status: 409 }))
    await assert.rejects(ticketApi.fetchTicket(1), (error) => error.status === 409 && /Conflict.*Stale version/.test(error.message))
    globalThis.fetch.mock.mockImplementation(async () => Response.json({ errors: { subject: 'Required', category: 'Invalid' } }, { status: 400 }))
    await assert.rejects(ticketApi.fetchTicket(1), (error) => error.status === 400 && /Validation failed.*Required Invalid/.test(error.message))
})

test('ticket response shape failures surface explicitly', async (context) => {
    context.mock.method(globalThis, 'fetch', async () => Response.json({ items: [], totalElements: 1 }))
    await assert.rejects(ticketApi.fetchTickets({}), /pagination response is invalid/)
    globalThis.fetch.mock.mockImplementation(async () => Response.json({ ...ticketDetail, ticket: { ...ticketSummary, version: undefined } }))
    await assert.rejects(ticketApi.fetchTicket(1), /detail response is invalid/)
    globalThis.fetch.mock.mockImplementation(async () => Response.json({ ...ticketDetail, ticket: { ...ticketSummary, createdAt: 'bad' } }))
    await assert.rejects(ticketApi.fetchTicket(1), /invalid ticket timestamp/)
})

test('private attachments use the authenticated backend endpoint', async (context) => {
    context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(new URL(url).pathname, '/api/tickets/1/attachments/7')
        assert.equal(options.credentials, 'include')
        return new Response('private notes', { headers: { 'Content-Type': 'text/plain' } })
    })
    assert.equal(await (await ticketApi.downloadTicketAttachment(1, 7)).text(), 'private notes')
})

test('ticket creation and rental report summary expose required controls and escalation', () => {
    const form = renderToStaticMarkup(createElement(TicketCreateForm, { categories: ['LOGIN_ISSUE', 'ACCOUNT_ISSUE'] }))
    assert.match(form, /Create a ticket/)
    assert.match(form, /maxLength="200"/)
    assert.match(form, /maxLength="6000"/)
    assert.match(form, /multiple="" accept="\.jpg,\.jpeg,\.png,\.webp,\.pdf,\.txt,\.csv"/)
    const report = renderToStaticMarkup(createElement(RentalReportSummary, { report: {
        reportType: 'NON_RETURN', status: 'OPEN', graceDeadlineAt: '2026-11-08T12:00:00',
        escalated: true, escalatedAt: '2026-11-08T12:00:00',
    } }))
    assert.match(report, /Non Return/)
    assert.match(report, /Escalated to Admin/)
    assert.equal(ticketApi.isTicketClosed('RESOLVED'), true)
    assert.equal(ticketApi.isTicketClosed('CANCELLED'), true)
    assert.equal(ticketApi.isTicketClosed('ON_HOLD'), false)
})
