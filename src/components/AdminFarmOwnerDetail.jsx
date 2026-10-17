import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:8080/api/admin/farm-admin-applications'
const UPLOAD_URL = 'http://localhost:8080/uploads/farm-admin'

function valueOrDash(value) {
    return value || '-'
}

function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleString()
}

function documentUrl(path) {
    if (!path) return ''
    const filename = path.replaceAll('\\', '/').split('/').pop()
    return `${UPLOAD_URL}/${encodeURIComponent(filename)}`
}

function AdminFarmOwnerDetail({ registrationId }) {
    const navigate = useNavigate()
    const [registration, setRegistration] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isReviewing, setIsReviewing] = useState(false)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')

    const fetchRegistration = useCallback(async () => {
        const response = await fetch(`${API_URL}/${registrationId}`, {
            credentials: 'include',
        })
        if (!response.ok) throw new Error('Unable to load this registration.')
        return response.json()
    }, [registrationId])

    useEffect(() => {
        let isActive = true
        fetchRegistration()
            .then((data) => {
                if (isActive) setRegistration(data)
            })
            .catch((requestError) => {
                if (isActive) setError(requestError.message)
            })
            .finally(() => {
                if (isActive) setIsLoading(false)
            })

        return () => { isActive = false }
    }, [fetchRegistration])

    async function reviewRegistration(action) {
        if (!registration || String(registration.status).toUpperCase() !== 'PENDING') return

        const reason = action === 'reject' ? rejectionReason.trim() : ''
        if (action === 'reject' && !reason) return

        try {
            setIsReviewing(true)
            setError('')
            const response = await fetch(`${API_URL}/${registrationId}/${action}`, {
                method: 'PUT',
                credentials: 'include',
                headers: action === 'reject' ? { 'Content-Type': 'application/json' } : undefined,
                body: action === 'reject' ? JSON.stringify({ rejectionReason: reason }) : undefined,
            })
            if (!response.ok) {
                const responseText = await response.text()
                throw new Error(responseText || `Unable to ${action} this registration.`)
            }
            setRegistration(await fetchRegistration())
            setIsRejectModalOpen(false)
            setRejectionReason('')
            setToast(action === 'approve'
                ? 'Registration approved successfully.'
                : 'Registration rejected successfully.')
            setTimeout(() => setToast(''), 4000)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setIsReviewing(false)
        }
    }

    if (isLoading) return <p className="admin-loading">Loading registration...</p>
    if (!registration) return <p className="admin-alert admin-alert-error" role="alert">{error || 'Registration not found.'}</p>

    const document = registration.document || {}
    const documents = [
        { label: 'ID front', path: document.idFrontPath },
        { label: 'ID back', path: document.idBackPath },
        { label: 'Selfie', path: document.selfiePath },
    ].filter((item) => item.path)
    const isPending = String(registration.status).toUpperCase() === 'PENDING'
    const approver = registration.approver
        ? registration.approver.userName || registration.approver.userId
        : registration.reviewedBy || '-'

    return (
        <section className="admin-detail-page">
            {toast && <div className="admin-toast admin-toast-success" role="status">{toast}</div>}
            <div className="admin-detail-heading">
                <div>
                    <Link className="admin-back-link" to="/admin/farm-owners">Back to Farm Admin List</Link>
                    <p className="admin-eyebrow">REGISTRATION #{registration.registrationId}</p>
                    <h2>Farm Admin Details</h2>
                </div>
                <span className={`status-badge status-${String(registration.status).toLowerCase()}`}>{registration.status}</span>
            </div>

            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}

            <div className="admin-detail-grid">
                <section className="admin-panel">
                    <h3>Personal information</h3>
                    <dl className="admin-info-grid">
                        <div><dt>First name</dt><dd>{valueOrDash(registration.firstName)}</dd></div>
                        <div><dt>Surname</dt><dd>{valueOrDash(registration.surname)}</dd></div>
                        <div><dt>Middle initial</dt><dd>{valueOrDash(registration.middleInitial)}</dd></div>
                        <div><dt>Name extension</dt><dd>{valueOrDash(registration.nameExtension)}</dd></div>
                        <div><dt>Email</dt><dd>{valueOrDash(registration.email)}</dd></div>
                        <div><dt>Personal email</dt><dd>{valueOrDash(registration.personalEmail)}</dd></div>
                        <div><dt>Mobile number</dt><dd>{valueOrDash(registration.mobileNumber)}</dd></div>
                        <div><dt>Submitted</dt><dd>{formatDate(registration.submittedAt)}</dd></div>
                    </dl>
                </section>

                <section className="admin-panel">
                    <h3>Address</h3>
                    <dl className="admin-info-grid">
                        <div><dt>House / lot / block</dt><dd>{valueOrDash(registration.houseLotBlock)}</dd></div>
                        <div><dt>Street</dt><dd>{valueOrDash(registration.street)}</dd></div>
                        <div><dt>Barangay</dt><dd>{valueOrDash(registration.barangay)}</dd></div>
                        <div><dt>Municipality / city</dt><dd>{valueOrDash(registration.municipalityCity)}</dd></div>
                        <div><dt>Province</dt><dd>{valueOrDash(registration.province)}</dd></div>
                        <div><dt>Region</dt><dd>{valueOrDash(registration.region)}</dd></div>
                        <div><dt>ZIP code</dt><dd>{valueOrDash(registration.zipCode)}</dd></div>
                    </dl>
                </section>
            </div>

            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h3>Submitted documents</h3>
                        <p>Document type: {valueOrDash(document.idType)}</p>
                    </div>
                    <span className={`status-badge status-${String(document.verificationStatus || '').toLowerCase()}`}>{valueOrDash(document.verificationStatus)}</span>
                </div>
                <div className="document-gallery">
                    {documents.map((item) => (
                        <a className="document-card" href={documentUrl(item.path)} target="_blank" rel="noreferrer" key={item.label}>
                            <img src={documentUrl(item.path)} alt={item.label} />
                            <span>{item.label}</span>
                        </a>
                    ))}
                    {!documents.length && <p className="admin-table-empty">No uploaded documents are available.</p>}
                </div>
            </section>

            <section className="admin-panel">
                <h3>Approval</h3>
                <dl className="admin-info-grid">
                    <div><dt>Status</dt><dd>{valueOrDash(registration.status)}</dd></div>
                    <div><dt>Approver</dt><dd>{valueOrDash(approver)}</dd></div>
                    <div><dt>Reviewed</dt><dd>{formatDate(registration.reviewedAt)}</dd></div>
                </dl>
            </section>

            {registration.rejectionReason && (
                <p className="admin-alert admin-alert-error"><strong>Rejection reason:</strong> {registration.rejectionReason}</p>
            )}

            <div className="admin-review-actions">
                <button className="admin-button admin-button-secondary" onClick={() => navigate('/admin/farm-owners')}>Close</button>
                <button className="admin-button admin-button-danger" disabled={!isPending || isReviewing} onClick={() => setIsRejectModalOpen(true)}>Reject registration</button>
                <button className="admin-button admin-button-primary" disabled={!isPending || isReviewing} onClick={() => reviewRegistration('approve')}>Approve registration</button>
            </div>

            {isRejectModalOpen && (
                <div className="admin-modal-backdrop" role="presentation">
                    <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="reject-reason-title">
                        <div className="admin-modal-heading">
                            <div>
                                <p className="admin-eyebrow">REGISTRATION REVIEW</p>
                                <h3 id="reject-reason-title">Reject registration</h3>
                            </div>
                            <button className="admin-modal-close" type="button" aria-label="Close rejection dialog" onClick={() => setIsRejectModalOpen(false)}>×</button>
                        </div>
                        <label className="admin-modal-label" htmlFor="rejection-reason">Reason for rejection</label>
                        <textarea
                            id="rejection-reason"
                            className="admin-modal-input"
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            placeholder="Enter the reason for rejecting this registration"
                            rows="4"
                            autoFocus
                        />
                        <div className="admin-modal-actions">
                            <button className="admin-button admin-button-secondary" type="button" onClick={() => setIsRejectModalOpen(false)}>Cancel</button>
                            <button className="admin-button admin-button-danger" type="button" disabled={!rejectionReason.trim() || isReviewing} onClick={() => reviewRegistration('reject')}>Confirm rejection</button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    )
}

export default AdminFarmOwnerDetail
