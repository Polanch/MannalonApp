import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accountError, fetchAppealAccess, logoutAccount, submitAccountAppeal } from '../services/userManagementApi.js'
import '../assets/styles/user-management.css'

function Appeal() {
    const [access, setAccess] = useState(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)
    const [revision, setRevision] = useState(0)

    useEffect(() => {
        let active = true
        fetchAppealAccess().then((data) => { if (active) setAccess(data) })
            .catch((failure) => {
                if (active) {
                    setError(accountError(failure))
                    if ([401, 409].includes(failure.response?.status)) setAccess(null)
                }
            })
        return () => { active = false }
    }, [revision])

    async function submit(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            const appeal = await submitAccountAppeal(message.trim())
            setAccess((current) => ({ ...current, appeal }))
            setMessage('')
        } catch (failure) {
            setError(accountError(failure))
        } finally {
            setBusy(false)
        }
    }

    async function leave(event) {
        event.preventDefault()
        setBusy(true)
        try {
            await logoutAccount()
            window.location.assign('/')
        } catch (failure) {
            setError(accountError(failure))
            setBusy(false)
        }
    }

    return (
        <main className="account-appeal-page">
            <section className="account-appeal-card">
                <p className="um-eyebrow">MANNALON ACCOUNT</p>
                <h1>Access temporarily blocked</h1>
                <p>You can ask an administrator to review your account.</p>
                {error && <p className="um-error" role="alert">{error}</p>}
                {!access && !error && <p role="status">Loading account status...</p>}
                {access && <>
                    <div className="um-block-reason"><strong>Reason</strong><p>{access.reason}</p></div>
                    {access.appeal ? <div role="status">
                        <h2>Appeal {access.appeal.status.toLowerCase()}</h2>
                        <p className="um-preserve">{access.appeal.message}</p>
                        {access.appeal.reviewNote && <p><strong>Admin response:</strong> {access.appeal.reviewNote}</p>}
                        <p className="um-muted">One appeal per block. Sign in again if access has been restored.</p>
                    </div> : <form onSubmit={submit}>
                        <label htmlFor="appeal-message">Your appeal</label>
                        <textarea id="appeal-message" required maxLength={3000} rows={6} value={message}
                            disabled={busy} onChange={(event) => setMessage(event.target.value)} placeholder="Explain why your access should be restored." />
                        <small className="um-muted">Do not include passwords or sensitive documents.</small>
                        <button type="submit" disabled={busy || !message.trim()}>{busy ? 'Submitting...' : 'Submit appeal'}</button>
                    </form>}
                </>}
                <div className="um-actions">
                    <button type="button" disabled={busy} onClick={() => { setError(''); setRevision((value) => value + 1) }}>Refresh status</button>
                    <Link to="/" onClick={leave}>Back to sign in</Link>
                </div>
            </section>
        </main>
    )
}

export default Appeal
