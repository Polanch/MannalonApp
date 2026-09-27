import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:8080/api/farm-admin/registrations'

function valueOrDash(value) {
    return value || '-'
}

function userLabel(user) {
    if (!user) return '-'
    return user.userName || user.userId || '-'
}

function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleString()
}

function documentUrl(path) {
    return path ? `http://localhost:8080${path}` : ''
}

function AdminFarmDetail({ registrationId }) {
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
        if (!response.ok) throw new Error('Unable to load this farm registration.')
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
                throw new Error(responseText || `Unable to ${action} this farm registration.`)
            }

            setRegistration(await fetchRegistration())
            setIsRejectModalOpen(false)
            setRejectionReason('')
            setToast(action === 'approve'
                ? 'Farm registration approved successfully.'
                : 'Farm registration rejected successfully.')
            setTimeout(() => setToast(''), 4000)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setIsReviewing(false)
        }
    }

    if (isLoading) return <p className="admin-loading">Loading farm registration...</p>
    if (!registration) return <p className="admin-alert admin-alert-error" role="alert">{error || 'Farm registration not found.'}</p>

    const isPending = String(registration.status).toUpperCase() === 'PENDING'

    return (
        <section className="admin-detail-page">
            {toast && <div className="admin-toast admin-toast-success" role="status">{toast}</div>}
            <div className="admin-detail-heading">
                <div>
                    <Link className="admin-back-link" to="/admin/farm-management">Back to Farm Registration List</Link>
                    <p className="admin-eyebrow">FARM REGISTRATION #{registration.registrationId}</p>
                    <h2>{registration.farmName}</h2>
                </div>
                <span className={`status-badge status-${String(registration.status).toLowerCase()}`}>{registration.status}</span>
            </div>

            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}

            <div className="admin-detail-grid">
                <section className="admin-panel">
                    <h3>Farm information</h3>
                    <dl className="admin-info-grid">
                        <div><dt>Farm name</dt><dd>{valueOrDash(registration.farmName)}</dd></div>
                        <div><dt>Area</dt><dd>{registration.areaHectares ? `${registration.areaHectares} hectares` : '-'}</dd></div>
                        <div><dt>Farm type</dt><dd>{valueOrDash(registration.farmType)}</dd></div>
                        <div><dt>Irrigation type</dt><dd>{valueOrDash(registration.irrigationType)}</dd></div>
                        <div><dt>Ownership type</dt><dd>{valueOrDash(registration.ownershipType)}</dd></div>
                        <div><dt>Farm code</dt><dd>{valueOrDash(registration.farmCode)}</dd></div>
                    </dl>
                </section>

                <section className="admin-panel">
                    <h3>Farm location</h3>
                    <dl className="admin-info-grid">
                        <div><dt>Region</dt><dd>{valueOrDash(registration.region)}</dd></div>
                        <div><dt>Province</dt><dd>{valueOrDash(registration.province)}</dd></div>
                        <div><dt>Municipality / city</dt><dd>{valueOrDash(registration.municipalityCity)}</dd></div>
                        <div><dt>Barangay</dt><dd>{valueOrDash(registration.barangay)}</dd></div>
                        <div><dt>Sitio / purok</dt><dd>{valueOrDash(registration.sitio)}</dd></div>
                        <div><dt>Submitted</dt><dd>{formatDate(registration.createdAt)}</dd></div>
                    </dl>
                </section>
            </div>

            <section className="admin-panel">
                <h3>Approval</h3>
                <dl className="admin-info-grid">
                    <div><dt>Status</dt><dd>{valueOrDash(registration.status)}</dd></div>
                    <div><dt>Approver</dt><dd>{userLabel(registration.approver)}</dd></div>
                    <div><dt>Reviewer</dt><dd>{userLabel(registration.reviewer)}</dd></div>
                    <div><dt>Rejection reason</dt><dd>{valueOrDash(registration.rejectionReason)}</dd></div>
                </dl>
            </section>

            <section className="admin-panel">
                <h3>Submitted documents</h3>
                <div className="admin-document-list">
                    {registration.documents?.map((document) => (
                        <a className="admin-document-link" href={documentUrl(document.filePath)} target="_blank" rel="noreferrer" key={document.documentId}>
                            <strong>{valueOrDash(document.documentType)}</strong>
                            <span>{valueOrDash(document.documentNumber)}</span>
                            <span>{valueOrDash(document.fileName)}</span>
                        </a>
                    ))}
                    {!registration.documents?.length && <p className="admin-table-empty">No uploaded documents are available.</p>}
                </div>
            </section>

            <div className="admin-review-actions">
                <button className="admin-button admin-button-secondary" onClick={() => navigate('/admin/farm-management')}>Close</button>
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

export default AdminFarmDetail