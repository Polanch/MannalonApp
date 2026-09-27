import { useEffect, useState } from 'react'
import '../assets/styles/admin.css'

const API_URL = 'http://localhost:8080/api/farm-admin/farmer-registrations'
const API_ORIGIN = 'http://localhost:8080'

function valueOrDash(value) {
    return value || '-'
}

function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function statusClass(status) {
    return `status-badge status-${String(status || '').toLowerCase()}`
}

function getFarmerName(farmer) {
    return [farmer.firstName, farmer.middleName, farmer.lastName].filter(Boolean).join(' ') || farmer.mobileNumber || '-'
}

async function responseMessage(response, fallback) {
    const responseText = await response.text()
    if (!responseText) return fallback

    try {
        const responseData = JSON.parse(responseText)
        return responseData.message || responseData.detail || responseData.error || fallback
    } catch {
        return responseText
    }
}

function FarmerInfo({ items }) {
    return (
        <dl className="admin-info-grid">
            {items.map(([label, value]) => (
                <div key={label}>
                    <dt>{label}</dt>
                    <dd>{valueOrDash(value)}</dd>
                </div>
            ))}
        </dl>
    )
}

function FarmAdminFarmers() {
    const [registrations, setRegistrations] = useState([])
    const [selectedRegistrationId, setSelectedRegistrationId] = useState(null)
    const [registration, setRegistration] = useState(null)
    const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('')
    const [selfieError, setSelfieError] = useState('')
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('PENDING')
    const [isLoading, setIsLoading] = useState(true)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [isReviewing, setIsReviewing] = useState(false)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [error, setError] = useState('')
    const [detailError, setDetailError] = useState('')
    const [toast, setToast] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let isActive = true

        async function loadRegistrations() {
            try {
                setIsLoading(true)
                setError('')
                const query = status === 'ALL' ? '' : `?status=${encodeURIComponent(status)}`
                const response = await fetch(`${API_URL}${query}`, { credentials: 'include' })
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Farmer review API is not available yet. Ask the backend developer to implement the Farmer registration review endpoints.')
                    }
                    throw new Error(await responseMessage(response, 'Unable to load Farmer registrations.'))
                }

                const data = await response.json()
                if (isActive) setRegistrations(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setError(requestError.message || 'Unable to load Farmer registrations.')
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        loadRegistrations()
        return () => { isActive = false }
    }, [status, refreshKey])

    useEffect(() => {
        let isActive = true

        async function loadRegistration() {
            if (!selectedRegistrationId) {
                setRegistration(null)
                setDetailError('')
                return
            }

            try {
                setIsDetailLoading(true)
                setDetailError('')
                const response = await fetch(`${API_URL}/${encodeURIComponent(selectedRegistrationId)}`, { credentials: 'include' })
                if (!response.ok) {
                    throw new Error(await responseMessage(response, 'Unable to load this Farmer registration.'))
                }
                const data = await response.json()
                if (isActive) setRegistration(data)
            } catch (requestError) {
                if (isActive) setDetailError(requestError.message || 'Unable to load this Farmer registration.')
            } finally {
                if (isActive) setIsDetailLoading(false)
            }
        }

        loadRegistration()
        return () => { isActive = false }
    }, [selectedRegistrationId, refreshKey])

    useEffect(() => {
        let isActive = true
        let objectUrl = ''
        setSelfiePreviewUrl('')
        setSelfieError('')

        async function loadSelfie() {
            if (!registration?.selfieUrl) return

            try {
                const selfieUrl = new URL(registration.selfieUrl, API_ORIGIN)
                const response = await fetch(selfieUrl, { credentials: 'include' })
                if (!response.ok) throw new Error('Unable to load the submitted selfie.')

                const selfieImage = await response.blob()
                if (!isActive) return

                objectUrl = URL.createObjectURL(selfieImage)
                setSelfiePreviewUrl(objectUrl)
            } catch (requestError) {
                if (isActive) setSelfieError(requestError.message || 'Unable to load the submitted selfie.')
            }
        }

        loadSelfie()
        return () => {
            isActive = false
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [registration?.selfieUrl])

    const visibleRegistrations = registrations.filter((farmer) => {
        const searchText = search.trim().toLowerCase()
        return !searchText || [
            farmer.registrationId,
            farmer.farmCode,
            farmer.mobileNumber,
            farmer.firstName,
            farmer.lastName,
        ].some((value) => String(value || '').toLowerCase().includes(searchText))
    })

    async function reviewRegistration(action) {
        if (!registration || String(registration.status).toUpperCase() !== 'PENDING') return

        const reason = action === 'reject' ? rejectionReason.trim() : ''
        if (action === 'reject' && !reason) return

        try {
            setIsReviewing(true)
            setDetailError('')
            const response = await fetch(`${API_URL}/${encodeURIComponent(registration.registrationId)}/${action}`, {
                method: 'PUT',
                credentials: 'include',
                headers: action === 'reject' ? { 'Content-Type': 'application/json' } : undefined,
                body: action === 'reject' ? JSON.stringify({ rejectionReason: reason }) : undefined,
            })
            if (!response.ok) {
                throw new Error(await responseMessage(response, `Unable to ${action} this Farmer registration.`))
            }

            setIsRejectModalOpen(false)
            setRejectionReason('')
            setToast(action === 'approve'
                ? 'Farmer registration approved successfully.'
                : 'Farmer registration rejected successfully.')
            setRefreshKey((currentKey) => currentKey + 1)
        } catch (requestError) {
            setDetailError(requestError.message || `Unable to ${action} this Farmer registration.`)
        } finally {
            setIsReviewing(false)
        }
    }

    if (selectedRegistrationId) {
        return (
            <main className="farm-admin-land">
                <section className="admin-detail-page">
                    {toast && <div className="admin-toast admin-toast-success" role="status">{toast}</div>}
                    <div className="admin-detail-heading">
                        <div>
                            <button type="button" className="admin-back-link farmer-review-back" onClick={() => setSelectedRegistrationId(null)}>Back to Farmers</button>
                            <p className="admin-eyebrow">FARMER REGISTRATION #{selectedRegistrationId}</p>
                            <h2>{registration ? getFarmerName(registration) : 'Farmer registration'}</h2>
                        </div>
                        {registration && <span className={statusClass(registration.status)}>{registration.status}</span>}
                    </div>

                    {detailError && <p className="admin-alert admin-alert-error" role="alert">{detailError}</p>}
                    {isDetailLoading ? <p className="admin-loading">Loading Farmer details...</p> : registration && (
                        <>
                            <div className="admin-detail-grid">
                                <section className="admin-panel">
                                    <h3>Personal information</h3>
                                    <FarmerInfo items={[
                                        ['First name', registration.firstName],
                                        ['Middle name', registration.middleName],
                                        ['Last name', registration.lastName],
                                        ['Birthdate', registration.birthdate],
                                        ['Civil status', registration.civilStatus],
                                        ['Gender', registration.gender],
                                    ]} />
                                </section>
                                <section className="admin-panel">
                                    <h3>Farm and contact</h3>
                                    <FarmerInfo items={[
                                        ['Farm code', registration.farmCode],
                                        ['Mobile number', registration.mobileNumber],
                                        ['Submitted', formatDate(registration.submittedAt)],
                                    ]} />
                                    <p className="farmer-review-password-note">Password is not displayed to protect the Farmer's account.</p>
                                </section>
                            </div>

                            <section className="admin-panel">
                                <h3>Home address</h3>
                                <FarmerInfo items={[
                                    ['House / lot / block', registration.houseLotBlock],
                                    ['Street', registration.street],
                                    ['Barangay', registration.barangay],
                                    ['Municipality / city', registration.municipalityCity],
                                    ['Province', registration.province],
                                    ['Region', registration.region],
                                    ['ZIP code', registration.zipCode],
                                ]} />
                            </section>

                            <section className="admin-panel">
                                <h3>Selfie with ID</h3>
                                {selfieError && <p className="admin-alert admin-alert-error" role="alert">{selfieError}</p>}
                                {selfiePreviewUrl ? (
                                    <img className="farmer-review-selfie" src={selfiePreviewUrl} alt={`Selfie with ID submitted by ${getFarmerName(registration)}`} />
                                ) : !selfieError && <p className="farmer-review-selfie-empty">Loading submitted selfie...</p>}
                            </section>

                            {registration.rejectionReason && (
                                <p className="admin-alert admin-alert-error"><strong>Rejection reason:</strong> {registration.rejectionReason}</p>
                            )}

                            <div className="admin-review-actions">
                                <button type="button" className="admin-button admin-button-secondary" onClick={() => setSelectedRegistrationId(null)}>Close</button>
                                <button type="button" className="admin-button admin-button-danger" disabled={registration.status !== 'PENDING' || isReviewing} onClick={() => setIsRejectModalOpen(true)}>Reject registration</button>
                                <button type="button" className="admin-button admin-button-primary" disabled={registration.status !== 'PENDING' || isReviewing} onClick={() => reviewRegistration('approve')}>Approve registration</button>
                            </div>
                        </>
                    )}

                    {isRejectModalOpen && (
                        <div className="admin-modal-backdrop" role="presentation">
                            <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="farmer-reject-title">
                                <div className="admin-modal-heading">
                                    <div>
                                        <p className="admin-eyebrow">FARMER REGISTRATION REVIEW</p>
                                        <h3 id="farmer-reject-title">Reject registration</h3>
                                    </div>
                                    <button className="admin-modal-close" type="button" aria-label="Close rejection dialog" onClick={() => setIsRejectModalOpen(false)}>×</button>
                                </div>
                                <label className="admin-modal-label" htmlFor="farmer-rejection-reason">Reason for rejection</label>
                                <textarea
                                    id="farmer-rejection-reason"
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
            </main>
        )
    }

    return (
        <main className="farm-admin-land">
            <section className="admin-fo-page">
                {toast && <div className="admin-toast admin-toast-success" role="status">{toast}</div>}
                <div className="admin-fo-header">
                    <div>
                        <p className="admin-eyebrow">FARMER MANAGEMENT</p>
                        <h2>Farmer Registrations</h2>
                        <p className="admin-section-description">Review Farmer details and submitted selfies before approving their registration.</p>
                    </div>
                    <div className="admin-fo-controls">
                        <label>
                            <span>Search</span>
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, mobile, or farm code" />
                        </label>
                        <label>
                            <span>Status</span>
                            <select value={status} onChange={(event) => setStatus(event.target.value)}>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                                <option value="ALL">All statuses</option>
                            </select>
                        </label>
                    </div>
                </div>

                {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
                {isLoading ? <p className="admin-loading">Loading Farmer registrations...</p> : (
                    <div className="admin-table-wrap">
                        <table className="admin-data-table farmer-review-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Registration ID</th>
                                    <th>Farmer</th>
                                    <th>Mobile number</th>
                                    <th>Farm code</th>
                                    <th>Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRegistrations.map((farmer) => (
                                    <tr key={farmer.registrationId}>
                                        <td><span className={statusClass(farmer.status)}>{farmer.status}</span></td>
                                        <td>{farmer.registrationId}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="farmer-review-name-link"
                                                onClick={() => setSelectedRegistrationId(farmer.registrationId)}
                                            >
                                                {getFarmerName(farmer)}
                                            </button>
                                        </td>
                                        <td>{valueOrDash(farmer.mobileNumber)}</td>
                                        <td>{valueOrDash(farmer.farmCode)}</td>
                                        <td>{formatDate(farmer.submittedAt)}</td>
                                    </tr>
                                ))}
                                {!visibleRegistrations.length && (
                                    <tr><td className="admin-table-empty" colSpan="6">No Farmer registrations match the current filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    )
}

export default FarmAdminFarmers