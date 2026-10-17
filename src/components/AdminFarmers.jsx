import { useEffect, useState } from 'react'
import '../assets/styles/admin.css'
import SmsNotificationLog from './SmsNotificationLog.jsx'
import { REJECTION_QUICK_MESSAGES, SMS_MESSAGE_MAX, buildRejectionSms, smsSegments } from '../services/smsTemplates.js'

const API_URL = 'http://localhost:8080/api/admin/farmer-registrations'
const API_ORIGIN = 'http://localhost:8080'

function valueOrDash(value) {
    return value || '-'
}

function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function statusLabel(status) {
    return status === 'PENDING_ADMIN' ? 'PENDING RSBSA' : status
}

function statusClass(status) {
    return `status-badge status-${String(status === 'PENDING_ADMIN' ? 'PENDING' : status || '').toLowerCase()}`
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

function InfoGrid({ items }) {
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

function ProtectedFile({ url, label }) {
    const [file, setFile] = useState({ url: '', isPdf: false })
    const [error, setError] = useState('')

    useEffect(() => {
        let isActive = true
        let objectUrl = ''

        async function loadFile() {
            if (!url) return

            try {
                const response = await fetch(new URL(url, API_ORIGIN), { credentials: 'include' })
                if (!response.ok) throw new Error(`Unable to load ${label}.`)

                const blob = await response.blob()
                if (!isActive) return

                objectUrl = URL.createObjectURL(blob)
                setFile({ url: objectUrl, isPdf: blob.type === 'application/pdf' })
            } catch (requestError) {
                if (isActive) setError(requestError.message || `Unable to load ${label}.`)
            }
        }

        loadFile()
        return () => {
            isActive = false
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [url, label])

    if (!url) return <p className="farmer-review-selfie-empty">No {label} submitted.</p>
    if (error) return <p className="admin-alert admin-alert-error" role="alert">{error}</p>
    if (!file.url) return <p className="farmer-review-selfie-empty">Loading {label}...</p>

    return file.isPdf ? (
        <>
            <iframe className="farmer-review-selfie" src={file.url} title={label} style={{ width: '100%', height: '480px', border: 0 }} />
            <p><a href={file.url} target="_blank" rel="noreferrer">Open {label} in a new tab</a></p>
        </>
    ) : (
        <a href={file.url} target="_blank" rel="noreferrer">
            <img className="farmer-review-selfie" src={file.url} alt={label} />
        </a>
    )
}

const OFFICE_FILE_FIELDS = [
    ['rsbsaDocument', 'RSBSA document', 'image/jpeg,image/png,image/webp,application/pdf'],
    ['rsbsaIdFront', 'RSBSA ID (front)', 'image/jpeg,image/png,image/webp'],
    ['rsbsaIdBack', 'RSBSA ID (back)', 'image/jpeg,image/png,image/webp'],
]
const MAX_OFFICE_FILE_BYTES = 10 * 1024 * 1024

function OfficeRecordsForm({ registration, onSaved }) {
    const [rsbsaNumber, setRsbsaNumber] = useState(registration.rsbsaNumber || '')
    const [officeNotes, setOfficeNotes] = useState(registration.officeNotes || '')
    const [files, setFiles] = useState({})
    const [fileInputKey, setFileInputKey] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    const hasChanges = rsbsaNumber.trim() !== (registration.rsbsaNumber || '')
        || officeNotes.trim() !== (registration.officeNotes || '')
        || Object.values(files).some(Boolean)

    function chooseFile(field, file) {
        if (file && file.size > MAX_OFFICE_FILE_BYTES) {
            setError('Each file must be 10 MB or smaller.')
            return
        }
        setError('')
        setFiles((current) => ({ ...current, [field]: file || null }))
    }

    async function save(event) {
        event.preventDefault()
        if (!hasChanges) return

        const formData = new FormData()
        formData.append('rsbsaNumber', rsbsaNumber.trim())
        formData.append('officeNotes', officeNotes.trim())
        Object.entries(files).forEach(([field, file]) => {
            if (file) formData.append(field, file)
        })

        try {
            setIsSaving(true)
            setError('')
            const response = await fetch(`${API_URL}/${encodeURIComponent(registration.registrationId)}/office-records`, {
                method: 'PUT',
                credentials: 'include',
                body: formData,
            })
            if (!response.ok) throw new Error(await responseMessage(response, 'Unable to save office records.'))

            setFiles({})
            setFileInputKey((key) => key + 1)
            onSaved(await response.json())
        } catch (requestError) {
            setError(requestError.message || 'Unable to save office records.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className="admin-panel office-records">
            <div className="office-records-head">
                <div>
                    <h3>MAO office records</h3>
                    <p>Check the physical copy in the office. Fill in or replace what the Farmer submitted. Uploaded files replace the Farmer's copy.</p>
                </div>
                {registration.officeRecordsUpdatedAt && (
                    <span className="office-records-stamp">
                        Updated {formatDate(registration.officeRecordsUpdatedAt)}
                        {registration.officeRecordsUpdatedBy?.userName ? ` by ${registration.officeRecordsUpdatedBy.userName}` : ''}
                    </span>
                )}
            </div>
            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
            <form className="office-records-form" onSubmit={save}>
                <label>
                    <span>RSBSA number</span>
                    <input value={rsbsaNumber} onChange={(event) => setRsbsaNumber(event.target.value)} placeholder="e.g. 02-15-14-001-00123" maxLength={40} />
                </label>
                {OFFICE_FILE_FIELDS.map(([field, label, accept]) => (
                    <label key={`${field}-${fileInputKey}`}>
                        <span>{label}</span>
                        <input type="file" accept={accept} onChange={(event) => chooseFile(field, event.target.files?.[0])} />
                        <small>{files[field] ? files[field].name : 'Keeps the current file if empty'}</small>
                    </label>
                ))}
                <label className="office-records-notes">
                    <span>Office notes (internal, not sent to the Farmer)</span>
                    <textarea rows="3" value={officeNotes} maxLength={500} onChange={(event) => setOfficeNotes(event.target.value)} placeholder="e.g. Physical RSBSA form found in Brgy. Apam folder, page 12." />
                </label>
                <div className="office-records-actions">
                    <button type="submit" className="admin-button admin-button-primary" disabled={!hasChanges || isSaving}>
                        {isSaving ? 'Saving...' : 'Save office records'}
                    </button>
                </div>
            </form>
        </section>
    )
}

function AdminFarmers() {
    const [registrations, setRegistrations] = useState([])
    const [selectedRegistrationId, setSelectedRegistrationId] = useState(null)
    const [registration, setRegistration] = useState(null)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('PENDING_ADMIN')
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
                if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load Farmer registrations.'))

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
                if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load this Farmer registration.'))

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

    const visibleRegistrations = registrations.filter((farmer) => {
        const searchText = search.trim().toLowerCase()
        return !searchText || [
            farmer.registrationId,
            farmer.farmCode,
            farmer.mobileNumber,
            farmer.rsbsaNumber,
            farmer.firstName,
            farmer.lastName,
        ].some((value) => String(value || '').toLowerCase().includes(searchText))
    })

    async function reviewRegistration(action) {
        if (!registration || registration.status !== 'PENDING_ADMIN') return

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
            if (!response.ok) throw new Error(await responseMessage(response, `Unable to ${action} this Farmer registration.`))

            const updated = await response.json().catch(() => null)
            const latestSms = Array.isArray(updated?.notifications) ? updated.notifications[updated.notifications.length - 1] : null
            const smsStatus = String(latestSms?.status || '').toUpperCase()

            setIsRejectModalOpen(false)
            setRejectionReason('')
            setToast(action === 'approve'
                ? 'RSBSA validated. Farmer account activated.'
                : smsStatus === 'FAILED'
                    ? 'Registration rejected, but the SMS failed to send. See the SMS log.'
                    : smsStatus === 'SANDBOX'
                        ? 'Registration rejected. SMS recorded in sandbox mode (not delivered).'
                        : `Registration rejected. SMS sent to ${registration.mobileNumber}.`)
            setRefreshKey((currentKey) => currentKey + 1)
        } catch (requestError) {
            setDetailError(requestError.message || `Unable to ${action} this Farmer registration.`)
        } finally {
            setIsReviewing(false)
        }
    }

    useEffect(() => {
        if (!toast) return undefined
        const timeoutId = setTimeout(() => setToast(''), 4000)
        return () => clearTimeout(timeoutId)
    }, [toast])

    if (selectedRegistrationId) {
        const canReview = registration?.status === 'PENDING_ADMIN'

        return (
            <section className="admin-detail-page">
                {toast && <div className="admin-toast admin-toast-success" role="status">{toast}</div>}
                <div className="admin-detail-heading">
                    <div>
                        <button type="button" className="admin-back-link farmer-review-back" onClick={() => setSelectedRegistrationId(null)}>Back to Farmers</button>
                        <p className="admin-eyebrow">RSBSA VALIDATION #{selectedRegistrationId}</p>
                        <h2>{registration ? getFarmerName(registration) : 'Farmer registration'}</h2>
                    </div>
                    {registration && <span className={statusClass(registration.status)}>{statusLabel(registration.status)}</span>}
                </div>

                {detailError && <p className="admin-alert admin-alert-error" role="alert">{detailError}</p>}
                {isDetailLoading && !registration ? <p className="admin-loading">Loading Farmer details...</p> : registration && (
                    <>
                        <div className="admin-detail-grid">
                            <section className="admin-panel">
                                <h3>RSBSA</h3>
                                <InfoGrid items={[
                                    ['RSBSA number', registration.rsbsaNumber],
                                    ['Farm code', registration.farmCode],
                                    ['Mobile number', registration.mobileNumber],
                                    ['Submitted', formatDate(registration.submittedAt)],
                                ]} />
                            </section>
                            <section className="admin-panel">
                                <h3>Farm-Admin review</h3>
                                <InfoGrid items={[
                                    ['Reviewed by', registration.farmAdminReviewer?.userName],
                                    ['Reviewer ID', registration.farmAdminReviewer?.userId],
                                    ['Reviewed at', formatDate(registration.farmAdminReviewedAt)],
                                ]} />
                            </section>
                        </div>

                        <div className="admin-detail-grid">
                            <section className="admin-panel">
                                <h3>Personal information</h3>
                                <InfoGrid items={[
                                    ['First name', registration.firstName],
                                    ['Middle name', registration.middleName],
                                    ['Last name', registration.lastName],
                                    ['Birthdate', registration.birthdate],
                                    ['Civil status', registration.civilStatus],
                                    ['Gender', registration.gender],
                                ]} />
                            </section>
                            <section className="admin-panel">
                                <h3>Home address</h3>
                                <InfoGrid items={[
                                    ['House / lot / block', registration.houseLotBlock],
                                    ['Street', registration.street],
                                    ['Barangay', registration.barangay],
                                    ['Municipality / city', registration.municipalityCity],
                                    ['Province', registration.province],
                                    ['Region', registration.region],
                                    ['ZIP code', registration.zipCode],
                                ]} />
                            </section>
                        </div>

                        <section className="admin-panel">
                            <h3>RSBSA document</h3>
                            <ProtectedFile url={registration.rsbsaDocumentUrl} label="RSBSA document" />
                        </section>
                        <div className="admin-detail-grid">
                            <section className="admin-panel">
                                <h3>RSBSA ID (front)</h3>
                                <ProtectedFile url={registration.rsbsaIdFrontUrl} label="RSBSA ID front" />
                            </section>
                            <section className="admin-panel">
                                <h3>RSBSA ID (back)</h3>
                                <ProtectedFile url={registration.rsbsaIdBackUrl} label="RSBSA ID back" />
                            </section>
                        </div>
                        <section className="admin-panel">
                            <h3>Selfie with ID</h3>
                            <ProtectedFile url={registration.selfieUrl} label="selfie" />
                        </section>

                        {canReview ? (
                            <OfficeRecordsForm
                                key={`${registration.registrationId}-${registration.officeRecordsUpdatedAt || ''}`}
                                registration={registration}
                                onSaved={(updated) => {
                                    setRegistration(updated)
                                    setToast('Office records saved.')
                                }}
                            />
                        ) : (registration.officeNotes || registration.officeRecordsUpdatedAt) && (
                            <section className="admin-panel">
                                <h3>MAO office records</h3>
                                <InfoGrid items={[
                                    ['Office notes', registration.officeNotes],
                                    ['Updated by', registration.officeRecordsUpdatedBy?.userName],
                                    ['Updated at', formatDate(registration.officeRecordsUpdatedAt)],
                                ]} />
                            </section>
                        )}

                        {registration.adminReviewedAt && (
                            <section className="admin-panel">
                                <h3>Admin review</h3>
                                <InfoGrid items={[
                                    ['Reviewed by', registration.adminReviewer?.userName],
                                    ['Reviewed at', formatDate(registration.adminReviewedAt)],
                                ]} />
                            </section>
                        )}

                        {registration.rejectionReason && (
                            <p className="admin-alert admin-alert-error"><strong>Rejection reason:</strong> {registration.rejectionReason}</p>
                        )}

                        <SmsNotificationLog
                            notifications={registration.notifications}
                            description="A copy of each message is also shown to the Farmer's Farm-Admin."
                        />

                        <div className="admin-review-actions">
                            <button type="button" className="admin-button admin-button-secondary" onClick={() => setSelectedRegistrationId(null)}>Close</button>
                            <button type="button" className="admin-button admin-button-danger" disabled={!canReview || isReviewing} onClick={() => setIsRejectModalOpen(true)}>Reject &amp; text Farmer</button>
                            <button type="button" className="admin-button admin-button-primary" disabled={!canReview || isReviewing} onClick={() => reviewRegistration('approve')}>Validate RSBSA &amp; activate</button>
                        </div>
                    </>
                )}

                {isRejectModalOpen && registration && (() => {
                    const smsPreview = buildRejectionSms(registration.firstName, rejectionReason, registration.registrationId)
                    return (
                    <div className="admin-modal-backdrop" role="presentation">
                        <section className="admin-modal sms-composer" role="dialog" aria-modal="true" aria-labelledby="admin-farmer-reject-title">
                            <div className="admin-modal-heading">
                                <div>
                                    <p className="admin-eyebrow">RSBSA VALIDATION</p>
                                    <h3 id="admin-farmer-reject-title">Reject &amp; send SMS</h3>
                                </div>
                                <button className="admin-modal-close" type="button" aria-label="Close rejection dialog" onClick={() => setIsRejectModalOpen(false)}>×</button>
                            </div>
                            <p className="sms-composer-to">
                                Text message to <strong>{registration.mobileNumber || 'no mobile number'}</strong>. A copy goes to their Farm-Admin.
                            </p>
                            <div className="sms-quick">
                                {REJECTION_QUICK_MESSAGES.map((message) => (
                                    <button key={message} type="button" className={rejectionReason === message ? 'is-active' : ''} onClick={() => setRejectionReason(message)}>
                                        {message}
                                    </button>
                                ))}
                            </div>
                            <label className="admin-modal-label" htmlFor="admin-farmer-rejection-reason">Message to the Farmer</label>
                            <textarea
                                id="admin-farmer-rejection-reason"
                                className="admin-modal-input"
                                value={rejectionReason}
                                maxLength={SMS_MESSAGE_MAX}
                                onChange={(event) => setRejectionReason(event.target.value)}
                                placeholder="I couldn't find your documents in the office. You may have to enroll with us first."
                                rows="4"
                                autoFocus
                            />
                            <div className="sms-composer-count">
                                <span>{rejectionReason.length}/{SMS_MESSAGE_MAX}</span>
                                <span>{smsPreview.length} characters · {smsSegments(smsPreview)} SMS</span>
                            </div>
                            <p className="admin-modal-label">Preview</p>
                            <p className="sms-log-bubble sms-composer-preview">{smsPreview}</p>
                            <div className="admin-modal-actions">
                                <button className="admin-button admin-button-secondary" type="button" onClick={() => setIsRejectModalOpen(false)}>Cancel</button>
                                <button className="admin-button admin-button-danger" type="button" disabled={!rejectionReason.trim() || isReviewing} onClick={() => reviewRegistration('reject')}>
                                    {isReviewing ? 'Sending...' : 'Reject & send SMS'}
                                </button>
                            </div>
                        </section>
                    </div>
                    )
                })()}
            </section>
        )
    }

    return (
        <section className="admin-fo-page">
            {toast && <div className="admin-toast admin-toast-success" role="status">{toast}</div>}
            <div className="admin-fo-header">
                <div>
                    <p className="admin-eyebrow">FARMER MANAGEMENT</p>
                    <h2>Farmer RSBSA Validation</h2>
                    <p className="admin-section-description">Validate the RSBSA of Farmers already approved by their Farm-Admin. Accounts are activated only after your approval.</p>
                </div>
                <div className="admin-fo-controls">
                    <label>
                        <span>Search</span>
                        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, mobile, farm code, or RSBSA" />
                    </label>
                    <label>
                        <span>Status</span>
                        <select value={status} onChange={(event) => setStatus(event.target.value)}>
                            <option value="PENDING_ADMIN">Pending RSBSA validation</option>
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
                                <th>RSBSA number</th>
                                <th>Mobile number</th>
                                <th>Farm code</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRegistrations.map((farmer) => (
                                <tr key={farmer.registrationId}>
                                    <td><span className={statusClass(farmer.status)}>{statusLabel(farmer.status)}</span></td>
                                    <td>{farmer.registrationId}</td>
                                    <td>
                                        <button type="button" className="farmer-review-name-link" onClick={() => setSelectedRegistrationId(farmer.registrationId)}>
                                            {getFarmerName(farmer)}
                                        </button>
                                    </td>
                                    <td>{valueOrDash(farmer.rsbsaNumber)}</td>
                                    <td>{valueOrDash(farmer.mobileNumber)}</td>
                                    <td>{valueOrDash(farmer.farmCode)}</td>
                                    <td>{formatDate(farmer.createdAt)}</td>
                                </tr>
                            ))}
                            {!visibleRegistrations.length && (
                                <tr><td className="admin-table-empty" colSpan="7">No Farmer registrations match the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

export default AdminFarmers
