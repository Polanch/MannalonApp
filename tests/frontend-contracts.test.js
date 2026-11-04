import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import axios from 'axios'

let server
let ChatbotAnswer
let registryApi
let FarmerChatbot
let ticketApi
let TicketCreateForm
let RentalReportSummary
let AdminTicketOverview
let branchesApi
let globalSearch
let FarmerSearch
let LibraryContentStatus
let libraryApi
let irriApi
let IrriResourceList
let crawlApi
let IrriCrawlProgress
let farmCodeMock

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
    globalSearch = await server.ssrLoadModule('/src/services/globalSearch.js')
    FarmerSearch = (await server.ssrLoadModule('/src/components/FarmerSearch.jsx')).default
    LibraryContentStatus = (await server.ssrLoadModule('/src/components/LibraryContentStatus.jsx')).default
    libraryApi = await server.ssrLoadModule('/src/services/libraryApi.js')
    irriApi = await server.ssrLoadModule('/src/services/irriSearchApi.js')
    IrriResourceList = (await server.ssrLoadModule('/src/components/IrriSearchResults.jsx')).IrriResourceList
    crawlApi = await server.ssrLoadModule('/src/services/irriCrawlApi.js')
    IrriCrawlProgress = (await server.ssrLoadModule('/src/components/AdminIrriCrawl.jsx')).IrriCrawlProgress
    farmCodeMock = await server.ssrLoadModule('/src/services/farmCodeMock.js')
})

after(async () => {
    await server?.close()
})

const sourceUrl = 'https://knowledgebank.irri.org/water'
test('unified search displays books, people, and posts in that order and validates queries', () => {
    const session = { userId: 'F-101' }
    const html = renderToStaticMarkup(createElement(FarmerSearch, { query: 'rice', session }))
    assert.ok(html.indexOf('id="search-books"') < html.indexOf('id="search-people"'))
    assert.ok(html.indexOf('id="search-people"') < html.indexOf('id="search-posts"'))
    assert.ok(html.indexOf('id="search-posts"') < html.indexOf('id="search-irri"'))
    assert.match(html, /indexed PDF text/)
    for (const query of ['', ' ', 'a', 'a'.repeat(201)]) {
        const invalid = renderToStaticMarkup(createElement(FarmerSearch, { query, session }))
        assert.match(invalid, /Enter between 2 and 200 characters/)
        assert.doesNotMatch(invalid, /id="search-books"/)
    }
})

test('mock Farm Code messages normalize mobile numbers and skip invalid/duplicate recipients', () => {
    const farm = { farmId: 4, farmName: 'Main farm', status: 'APPROVED', farmCode: 'FARM-0004' }
    const recipients = [
        { farmerId: 'A', firstName: 'Alice', mobileNumber: '09171234567' },
        { farmerId: 'B', mobileNumber: '+63 917 123 4567' },
        { farmerId: 'C', mobileNumber: 'invalid' },
        { farmerId: 'D', mobileNumber: '639181234567' },
    ]
    const batch = farmCodeMock.prepareFarmCodeMock(farm, recipients)
    assert.deepEqual(batch.recipients.map((item) => item.status), ['READY', 'DUPLICATE_NUMBER', 'INVALID_NUMBER', 'READY'])
    assert.equal(batch.recipients[0].phone, '+639171234567')
    assert.match(batch.message, /Farm Code: FARM-0004/)
    assert.match(batch.message, /Mannalon.com/)
    assert.equal(recipients[0].mobileNumber, '09171234567')
})

test('mock Farm Code messages require an approved main farm and a valid selected recipient', () => {
    const main = { farmId: 4, status: 'APPROVED', farmCode: 'FARM-0004' }
    for (const farm of [null, { ...main, status: 'PENDING' }, { ...main, parentFarmId: 1 }, { ...main, farmCode: null },
        { ...main, farmCode: '   ' }, { ...main, farmId: -1 }, { ...main, farmId: 'invalid' }]) {
        assert.throws(() => farmCodeMock.prepareFarmCodeMock(farm, [{ mobileNumber: '09171234567' }]), /approved main farm/)
    }
    assert.throws(() => farmCodeMock.prepareFarmCodeMock(main, []), /at least one/)
    assert.throws(() => farmCodeMock.prepareFarmCodeMock(main, [{ mobileNumber: '' }]), /valid, unique/)
    assert.equal(farmCodeMock.approvedCodeFarms([main, { ...main, parentFarmId: 1 }]).length, 1)
    for (const number of ['+19999999999', '0917123456', '091712345678', '09abc123456']) {
        assert.equal(farmCodeMock.normalizeFarmCodePhone(number), '')
    }
})

test('Admin IRRI crawl uses session-only queue/progress requests and accepts an existing running job', async (context) => {
    const signal = new AbortController().signal
    const progress = { jobId: 12, status: 'RUNNING', discovered: 143, indexed: 96, unchanged: 31, skipped: 10, failed: 6, lastRefresh: null, limitsReached: false, message: 'Running' }
    context.mock.method(axios.Axios.prototype, '_request', async function (config) {
        assert.equal(this.defaults.withCredentials, true)
        assert.equal(config.params, undefined)
        assert.equal(config.data, undefined)
        if (config.method === 'post') return { status: 202, data: { jobId: 12, status: 'RUNNING', message: 'Already queued' } }
        assert.equal(config.url, '/progress')
        assert.equal(config.signal, signal)
        return { data: progress }
    })
    assert.equal((await crawlApi.queueIrriCrawl()).status, 'RUNNING')
    assert.deepEqual(await crawlApi.fetchIrriCrawlProgress(signal), progress)
})

test('Admin IRRI crawl rejects invalid confirmations/counts and distinguishes unavailable progress', async (context) => {
    context.mock.method(axios.Axios.prototype, '_request', async () => ({ status: 200, data: { jobId: 12, status: 'QUEUED', message: 'Queued' } }))
    await assert.rejects(() => crawlApi.queueIrriCrawl(), /did not confirm/)
    await assert.rejects(() => crawlApi.fetchIrriCrawlProgress(), /invalid IRRI crawl progress/)
    assert.match(crawlApi.irriCrawlError({ response: { status: 404 } }), /no job yet/)
    assert.match(crawlApi.irriCrawlError({ response: { status: 403 } }), /Permission denied/)
    assert.match(crawlApi.irriCrawlError({ response: { status: 503 } }), /disabled or unavailable/)
})

test('Admin IRRI progress shows limits and failed pages without claiming full site coverage', () => {
    const data = { jobId: 12, status: 'COMPLETED', discovered: 143, indexed: 96, unchanged: 31, skipped: 10, failed: 6, lastRefresh: null, limitsReached: true, message: '<script>unsafe</script>' }
    const html = renderToStaticMarkup(createElement(IrriCrawlProgress, { data }))
    assert.match(html, /Crawl limits reached/)
    assert.match(html, /completed with failed pages/)
    assert.match(html, /does not mean every IRRI page/)
    assert.match(html, /&lt;script&gt;/)
    assert.match(html, /Not reported yet/)
    const failed = renderToStaticMarkup(createElement(IrriCrawlProgress, { data: { ...data, status: 'FAILED' } }))
    assert.match(failed, /This crawl failed/)
})

test('IRRI search uses the backend with session credentials, cancellation, and pagination', async (context) => {
    const signal = new AbortController().signal
    const data = { items: [{ title: 'Rice growing', url: 'https://www.irri.org/rice', snippet: 'Rice resource' }], page: 2, size: 10, hasNext: false }
    context.mock.method(axios.Axios.prototype, '_request', async (config) => {
        assert.equal(new URL(config.url).pathname, '/api/search/irri')
        assert.deepEqual(config.params, { q: 'rice', page: 2, size: 10 })
        assert.equal(config.withCredentials, true)
        assert.equal(config.signal, signal)
        assert.equal(config.timeout, 20000)
        return { data }
    })
    assert.deepEqual(await irriApi.searchIrri({ query: 'rice', page: 2 }, signal), data)
})

test('IRRI search rejects non-IRRI links, unsafe protocols, malformed results, and wrong pages', async (context) => {
    let item = { title: 'Rice', url: 'https://irri.org/rice', snippet: '' }
    let result = { items: [item], page: 0, size: 10, hasNext: false }
    context.mock.method(axios.Axios.prototype, '_request', async () => ({ data: result }))
    for (const url of ['https://irri.org.evil.example/rice', 'https://evil-irri.org', 'http://irri.org/rice', 'javascript:alert(1)', 'https://user:password@irri.org', 'https://irri.org:8080', 'invalid']) {
        result = { items: [{ ...item, url }], page: 0, size: 10, hasNext: false }
        await assert.rejects(() => irriApi.searchIrri({ query: 'rice' }), /invalid|unverified/)
    }
    for (const invalid of [
        { items: [], page: 1, size: 10, hasNext: false },
        { items: [], page: 0, size: 10, hasNext: true },
        { items: [{ ...item, title: '' }], page: 0, size: 10, hasNext: false },
        { items: [{ ...item, snippet: null }], page: 0, size: 10, hasNext: false },
    ]) {
        result = invalid
        await assert.rejects(() => irriApi.searchIrri({ query: 'rice' }), /invalid|unverified/)
    }
    result = { items: [], page: 0, size: 10, hasNext: false }
    assert.equal((await irriApi.searchIrri({ query: 'rice' })).items.length, 0)
})

test('IRRI result links open original pages in new tabs and escape provider text', () => {
    const html = renderToStaticMarkup(createElement(IrriResourceList, { items: [{
        title: '<b>Rice resource</b>', url: 'https://knowledgebank.irri.org/rice', snippet: '<script>not executable</script>',
    }] }))
    assert.match(html, /target="_blank"/)
    assert.match(html, /rel="noopener noreferrer"/)
    assert.match(html, /&lt;b&gt;/)
    assert.match(html, /&lt;script&gt;/)
    assert.doesNotMatch(html, /<script>|<b>/)
})

test('IRRI search distinguishes unavailable support, permission, rate limits, and provider failures', () => {
    for (const [status, pattern] of [[404, /not available on the backend/], [403, /Permission denied/], [429, /rate-limited/], [503, /provider is unavailable/], [401, /sign in again/]]) {
        assert.match(irriApi.irriSearchError({ response: { status } }), pattern)
    }
})

test('Library PDF matches display a plain-text escaped excerpt only for document matches', () => {
    const book = { contentIndexStatus: 'INDEXED', matchesDocumentContent: true, contentMatchSnippet: '<script>alert("test")</script> Rice planting' }
    const html = renderToStaticMarkup(createElement(LibraryContentStatus, { book, showMatch: true }))
    assert.match(html, /Match inside PDF/)
    assert.match(html, /&lt;script&gt;/)
    assert.doesNotMatch(html, /<script>/)
    for (const props of [{ book }, { book: { ...book, matchesDocumentContent: false }, showMatch: true }]) {
        const hidden = renderToStaticMarkup(createElement(LibraryContentStatus, props))
        assert.doesNotMatch(hidden, /Match inside PDF|Rice planting/)
    }
})

test('Library indexing statuses explain OCR and failure limitations without hiding books', () => {
    const labels = { PENDING: /queued/, PROCESSING: /in progress/, INDEXED: /searchable/, NO_TEXT: /Scanned documents need OCR/, FAILED: /can still be read/ }
    for (const [contentIndexStatus, label] of Object.entries(labels)) {
        const html = renderToStaticMarkup(createElement(LibraryContentStatus, { book: { contentIndexStatus }, onRetry: () => {} }))
        assert.match(html, label)
        assert.equal(html.includes('Retry PDF indexing'), ['INDEXED', 'NO_TEXT', 'FAILED'].includes(contentIndexStatus))
    }
    const old = renderToStaticMarkup(createElement(LibraryContentStatus, { book: {} }))
    assert.match(old, /status is unavailable/)
    assert.doesNotMatch(old, /PDF text is searchable/)
    const busy = renderToStaticMarkup(createElement(LibraryContentStatus, { book: { contentIndexStatus: 'FAILED' }, onRetry: () => {}, busy: true }))
    assert.match(busy, /disabled=""/)
    assert.match(busy, /Queueing/)
})

test('Library indexing queue requests use session credentials and validate HTTP 202 confirmations', async (context) => {
    const calls = []
    context.mock.method(axios.Axios.prototype, '_request', async function (config) {
        assert.equal(this.defaults.withCredentials, true)
        assert.equal(config.method, 'post')
        assert.equal(config.data, undefined)
        calls.push(config.url)
        return { status: 202, data: config.url.includes('/retry')
            ? { bookId: 7, contentIndexStatus: 'PENDING' } : { queuedBooks: 0 } }
    })
    assert.equal((await libraryApi.retryLibraryContentIndex(7)).contentIndexStatus, 'PENDING')
    assert.equal((await libraryApi.backfillLibraryContentIndex()).queuedBooks, 0)
    assert.deepEqual(calls, ['/books/7/content-index/retry', '/content-index/backfill'])
})

test('Library indexing rejects unconfirmed queue responses and surfaces permission/conflict errors', async (context) => {
    context.mock.method(axios.Axios.prototype, '_request', async () => ({ status: 200, data: { bookId: 7, contentIndexStatus: 'PENDING', queuedBooks: 3 } }))
    await assert.rejects(() => libraryApi.retryLibraryContentIndex(7), /did not confirm/)
    await assert.rejects(() => libraryApi.backfillLibraryContentIndex(), /did not confirm/)
    assert.match(libraryApi.libraryError({ response: { status: 403 } }), /Permission denied/)
    assert.match(libraryApi.libraryError({ response: { status: 409 } }), /Refresh before retrying/)
})

test('post search matches text case-insensitively and sorts newest first with stable ID ties', () => {
    const posts = [
        { id: 1, content: 'Rice farming', createdAt: '2026-01-01T10:00:00' },
        { id: 2, content: 'corn', createdAt: '2026-11-01T10:00:00' },
        { id: 3, content: 'RICE harvest', createdAt: '2026-02-01T10:00:00' },
        { id: 4, content: 'rice seeds', createdAt: '2026-02-01T10:00:00' },
    ]
    assert.deepEqual(globalSearch.matchingPosts(posts, ' RICE ').map((post) => post.id), [4, 3, 1])
    assert.deepEqual(globalSearch.matchingPosts(posts, ''), [])
    assert.equal(posts[0].id, 1)
})

test('post search scans beyond the first page, deduplicates results, and marks completion only at the end', async () => {
    const progress = []
    const signal = new AbortController().signal
    const pages = [
        { content: [{ id: 4, content: 'corn', createdAt: '2026-11-01T00:00:00' }], hasNext: true },
        { content: [{ id: 2, content: 'Rice', createdAt: '2026-10-01T00:00:00' }], hasNext: true },
        { content: [{ id: 2, content: 'Rice', createdAt: '2026-10-01T00:00:00' }, { id: 1, content: 'rice', createdAt: '2026-09-01T00:00:00' }], hasNext: false },
    ]
    const requests = []
    await globalSearch.scanPosts({ userId: 'F-101', query: 'rice', signal, onProgress: (state) => progress.push(state) },
        async (request, requestSignal) => {
            assert.equal(requestSignal, signal)
            assert.equal(request.userId, 'F-101')
            assert.equal(request.size, 50)
            requests.push(request.page)
            return pages[request.page]
        })
    assert.deepEqual(requests, [0, 1, 2])
    assert.equal(progress[0].complete, false)
    assert.equal(progress[0].items.length, 0)
    assert.equal(progress[2].complete, true)
    assert.equal(progress[2].scanned, 4)
    assert.deepEqual(progress[2].items.map((post) => post.id), [2, 1])
})

test('post search stops on cancellation and never publishes an aborted response', async () => {
    const controller = new AbortController()
    let updates = 0
    await assert.rejects(() => globalSearch.scanPosts({
        userId: 'F-101', query: 'rice', signal: controller.signal, onProgress: () => { updates += 1 },
    }, async () => {
        controller.abort()
        return { content: [], hasNext: false }
    }), { name: 'AbortError' })
    assert.equal(updates, 0)
})

test('post search surfaces invalid pages and request failures without claiming completion', async () => {
    for (const response of [{ items: [], hasNext: false }, { content: [] }, { content: [], hasNext: true }]) {
        await assert.rejects(() => globalSearch.scanPosts({
            userId: 'F-101', query: 'rice', signal: new AbortController().signal,
            onProgress: () => assert.fail('Invalid pages must not publish success'),
        }, async () => response), /invalid post page|could not advance/)
    }
    await assert.rejects(() => globalSearch.scanPosts({
        userId: 'F-101', query: 'rice', signal: new AbortController().signal, onProgress: () => {},
    }, async () => { throw new Error('Permission denied') }), /Permission denied/)
})

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
