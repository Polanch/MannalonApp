import { useEffect, useState } from 'react'
import { API_ORIGIN } from '../services/farmerApi.js'
import { approvedCodeFarms, prepareFarmCodeMock } from '../services/farmCodeMock.js'
import Toast from './Toast.jsx'

function FarmCodeSender({ selected, onClear, onSimulated }) {
    const [farms, setFarms] = useState([])
    const [loading, setLoading] = useState(true)
    const [farmError, setFarmError] = useState('')
    const [error, setError] = useState('')
    const [revision, setRevision] = useState(0)
    const [farmId, setFarmId] = useState('')
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [notice, setNotice] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        async function load() {
            try {
                const response = await fetch(`${API_ORIGIN}/api/farm-admin/farms`, { credentials: 'include', signal: controller.signal })
                if (!response.ok) throw new Error(response.status === 403 ? 'Permission denied when loading your farms.' : 'Unable to load your approved farms.')
                const data = await response.json()
                if (!Array.isArray(data)) throw new Error('Invalid farm list returned by the backend.')
                if (!controller.signal.aborted) { setFarms(approvedCodeFarms(data)); setLoading(false) }
            } catch (failure) {
                if (!controller.signal.aborted) { setFarms([]); setFarmId(''); setFarmError(failure.message); setLoading(false) }
            }
        }
        load()
        return () => controller.abort()
    }, [revision])

    function prepare() {
        setError('')
        try {
            setPreview(prepareFarmCodeMock(farms.find((farm) => String(farm.farmId) === farmId), selected))
        } catch (failure) { setError(failure.message) }
    }

    function simulate() {
        const batch = { ...preview, simulatedAt: new Date().toISOString(), recipients: preview.recipients.map((recipient) => ({
            ...recipient, status: recipient.status === 'READY' ? 'SIMULATED' : recipient.status,
        })) }
        setResult(batch)
        setPreview(null)
        onSimulated(batch.recipients.map((recipient) => recipient.farmerId))
        setNotice(`Mock complete: ${batch.recipients.filter((recipient) => recipient.status === 'SIMULATED').length} simulated messages. No SMS was sent.`)
    }

    return <section className="farm-code-sender" aria-labelledby="farm-code-title">
        <h2 id="farm-code-title">Send Farm Code <span>MOCK ONLY</span></h2>
        <p>Select RSBSA rows below, choose your approved main farm, and review the message. No SMS, email, account creation, or farm membership change occurs.</p>
        <p>Selected records stay selected across directory pages and searches. Mock results exist only in this view and are not delivery confirmations.</p>
        {loading && <p role="status">Loading approved farms...</p>}
        {farmError && <p role="alert">{farmError} <button type="button" onClick={() => { setFarmError(''); setLoading(true); setRevision((value) => value + 1) }}>Reload farms</button></p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !farms.length && !farmError && <p>No approved main farm with a Farm Code. Register a main farm under Land and wait for Admin approval.</p>}
        <label>Approved main farm<select disabled={loading || Boolean(preview)} value={farmId} onChange={(event) => setFarmId(event.target.value)}>
            <option value="">Select a farm</option>
            {farms.map((farm) => <option key={farm.farmId} value={farm.farmId}>{farm.farmName} - {farm.farmCode}</option>)}
        </select></label>
        <div className="farm-code-actions">
            <span>{selected.length} selected records</span>
            <button type="button" disabled={!selected.length || !farmId || loading || Boolean(preview)} onClick={prepare}>Review mock messages</button>
            <button type="button" disabled={!selected.length || Boolean(preview)} onClick={onClear}>Clear selected rows</button>
        </div>
        {selected.length > 0 && <details><summary>Selected recipients ({selected.length})</summary><ul>
            {selected.map((farmer) => <li key={farmer.farmerId}>{farmer.firstName} {farmer.lastName} - {farmer.mobileNumber || 'Missing number'}</li>)}
        </ul></details>}
        <Toast message={notice} onDismiss={() => setNotice('')} />
        {preview && <div className="farm-code-preview" role="region" aria-label="Mock message confirmation">
            <h3>Confirm mock sending for {preview.farmName}</h3>
            <pre>{preview.message}</pre>
            <p>The site address above is requested demo text, not a verified deployment address.</p>
            <ul>{preview.recipients.map((recipient) => <li key={recipient.farmerId}>{recipient.name} - {recipient.phone}: {recipient.status === 'READY' ? 'Will simulate' : recipient.status === 'INVALID_NUMBER' ? 'Skipped: invalid number' : 'Skipped: duplicate number'}</li>)}</ul>
            <p>Only this snapshot will be simulated. Rows added afterward stay selected for the next batch.</p>
            <div className="farm-code-actions"><button type="button" onClick={simulate}>Send mock messages</button><button type="button" onClick={() => setPreview(null)}>Cancel</button></div>
        </div>}
        {result && <div className="farm-code-preview" role="region" aria-label="Mock sending results">
            <h3>Mock results - no SMS sent</h3>
            <p>{result.farmName} - {result.farmCode} · {result.simulatedAt}</p>
            <ul>{result.recipients.map((recipient) => <li key={recipient.farmerId}>{recipient.name} - {recipient.phone}: {recipient.status === 'SIMULATED' ? 'Simulated only (not delivered)' : recipient.status === 'INVALID_NUMBER' ? 'Skipped: invalid number' : 'Skipped: duplicate number'}</li>)}</ul>
            <button type="button" onClick={() => setResult(null)}>Dismiss mock results</button>
        </div>}
    </section>
}

export default FarmCodeSender
