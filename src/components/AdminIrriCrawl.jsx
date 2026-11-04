import { useEffect, useState } from 'react'
import { fetchIrriCrawlProgress, irriCrawlError, queueIrriCrawl } from '../services/irriCrawlApi.js'
import Toast from './Toast.jsx'
import '../assets/styles/irri-crawl.css'

export function IrriCrawlProgress({ data }) {
    return <div className="irri-crawl-progress">
        <p><strong>Job #{data.jobId}: {data.status}</strong></p>
        <p>{data.message}</p>
        <dl>{['discovered', 'indexed', 'unchanged', 'skipped', 'failed'].map((key) => <div key={key}>
            <dt>{key.charAt(0).toUpperCase() + key.slice(1)}</dt><dd>{data[key]}</dd>
        </div>)}</dl>
        <p>Last refresh: {data.lastRefresh ? <time dateTime={data.lastRefresh}>{data.lastRefresh.replace('T', ' ')}</time> : 'Not reported yet'}</p>
        {data.limitsReached && <p className="irri-crawl-warning" role="status">Crawl limits reached. Coverage is incomplete; review backend limits before the next refresh.</p>}
        {data.status === 'FAILED' && <p className="irri-crawl-warning" role="alert">This crawl failed. Check backend logs and configuration before retrying.</p>}
        {data.status === 'COMPLETED' && <p>{data.failed > 0 ? 'Crawl completed with failed pages.' : 'Crawl completed.'} This does not mean every IRRI page is indexed.</p>}
    </div>
}

function AdminIrriCrawl() {
    const [state, setState] = useState({ data: null, error: '', loading: true })
    const [revision, setRevision] = useState(0)
    const [busy, setBusy] = useState(false)
    const [actionError, setActionError] = useState('')
    const [notice, setNotice] = useState('')
    const [queued, setQueued] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        let pending = false
        async function load() {
            if (pending || controller.signal.aborted) return
            pending = true
            try {
                const data = await fetchIrriCrawlProgress(controller.signal)
                if (!controller.signal.aborted) setState({ data, error: '', loading: false })
            } catch (error) {
                if (!controller.signal.aborted) setState((current) => ({ ...current, error: irriCrawlError(error), loading: false }))
            } finally {
                pending = false
            }
        }
        load()
        const interval = setInterval(load, 15000)
        return () => { controller.abort(); clearInterval(interval) }
    }, [revision])

    async function queue() {
        if (busy) return
        setBusy(true)
        setActionError('')
        try {
            const job = await queueIrriCrawl()
            setQueued(job)
            setState({ data: null, error: '', loading: true })
            setNotice(`IRRI job #${job.jobId}: ${job.message} Indexing is not confirmed complete.`)
            setRevision((value) => value + 1)
        } catch (error) {
            setActionError(irriCrawlError(error))
        } finally {
            setBusy(false)
        }
    }

    return <section className="admin-irri-crawl" aria-labelledby="irri-crawl-title">
        <h3 id="irri-crawl-title">IRRI resource index</h3>
        <p>Discover and refresh permitted IRRI HTML pages for search and chatbot sources. Runs in the background; IRRI PDFs and OCR are not supported by this crawler.</p>
        <div className="irri-crawl-actions">
            <button type="button" disabled={busy || ['QUEUED', 'RUNNING'].includes(state.data?.status) || (queued && !state.data)} onClick={queue}>
                {busy ? 'Queueing...' : 'Start / refresh IRRI index'}
            </button>
            <button type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>Refresh crawl progress</button>
        </div>
        <p className="irri-crawl-hint">Progress refreshes every 15 seconds while this page is open. Queued does not mean indexed.</p>
        <Toast message={notice} onDismiss={() => setNotice('')} />
        {actionError && <p role="alert">{actionError}</p>}
        {queued && <p>Accepted job #{queued.jobId}: {queued.status}. {queued.message}</p>}
        {state.loading && <p role="status">Loading IRRI crawl progress...</p>}
        {state.error && <p role="alert">{state.error} {state.data && 'Showing last known progress; it may be stale.'}</p>}
        {state.data && <IrriCrawlProgress data={state.data} />}
    </section>
}

export default AdminIrriCrawl
