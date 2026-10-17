import { useEffect, useState } from 'react'
import '../assets/styles/admin.css'

const API_URL = 'http://localhost:8080/api/admin/programs'
const API_ORIGIN = 'http://localhost:8080'

const EMPTY_FORM = { name: '', description: '', deadline: '', requirements: [''], benefits: [{ name: '', description: '' }] }

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
    return [farmer.firstName, farmer.middleName, farmer.lastName].filter(Boolean).join(' ') || '-'
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

function useProtectedFile(url) {
    const [file, setFile] = useState({ source: '', url: '', isPdf: false, error: '' })

    useEffect(() => {
        if (!url) return undefined

        let isActive = true
        let objectUrl = ''

        async function load() {
            try {
                const response = await fetch(new URL(url, API_ORIGIN), { credentials: 'include' })
                if (!response.ok) throw new Error('Unable to load file.')
                const blob = await response.blob()
                if (!isActive) return
                objectUrl = URL.createObjectURL(blob)
                setFile({ source: url, url: objectUrl, isPdf: blob.type === 'application/pdf', error: '' })
            } catch (requestError) {
                if (isActive) setFile({ source: url, url: '', isPdf: false, error: requestError.message })
            }
        }

        load()
        return () => {
            isActive = false
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [url])

    return file.source === url ? file : { source: url, url: '', isPdf: false, error: '' }
}

function ProtectedImage({ url, alt, className }) {
    const file = useProtectedFile(url)
    if (!url) return <span className={`${className} admin-program-placeholder`} aria-hidden="true" />
    if (!file.url) return <span className={`${className} admin-program-placeholder`} aria-hidden="true" />
    return <img className={className} src={file.url} alt={alt} />
}

function DocumentPreview({ url, label }) {
    const file = useProtectedFile(url)

    if (!url) return <p className="farmer-review-selfie-empty">No file submitted.</p>
    if (file.error) return <p className="admin-alert admin-alert-error" role="alert">{file.error}</p>
    if (!file.url) return <p className="farmer-review-selfie-empty">Loading {label}...</p>

    return file.isPdf ? (
        <>
            <iframe title={label} src={file.url} style={{ width: '100%', height: '480px', border: 0 }} />
            <p><a href={file.url} target="_blank" rel="noreferrer">Open in a new tab</a></p>
        </>
    ) : (
        <a href={file.url} target="_blank" rel="noreferrer">
            <img className="farmer-review-selfie" src={file.url} alt={label} />
        </a>
    )
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

function AdminPrograms() {
    const [programs, setPrograms] = useState([])
    const [viewMode, setViewMode] = useState('grid')
    const [selectedProgramId, setSelectedProgramId] = useState(null)
    const [program, setProgram] = useState(null)
    const [selectedApplicationId, setSelectedApplicationId] = useState(null)
    const [application, setApplication] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [coverFile, setCoverFile] = useState(null)
    const [coverPreview, setCoverPreview] = useState('')
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [error, setError] = useState('')
    const [formError, setFormError] = useState('')
    const [detailError, setDetailError] = useState('')
    const [toast, setToast] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let isActive = true

        async function loadPrograms() {
            try {
                setIsLoading(true)
                setError('')
                const response = await fetch(API_URL, { credentials: 'include' })
                if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load Programs.'))
                const data = await response.json()
                if (isActive) setPrograms(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setError(requestError.message || 'Unable to load Programs.')
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        loadPrograms()
        return () => { isActive = false }
    }, [refreshKey])

    useEffect(() => {
        let isActive = true

        async function loadProgram() {
            if (!selectedProgramId) return

            try {
                setIsDetailLoading(true)
                setDetailError('')
                const response = await fetch(`${API_URL}/${encodeURIComponent(selectedProgramId)}`, { credentials: 'include' })
                if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load this Program.'))
                const data = await response.json()
                if (isActive) setProgram(data)
            } catch (requestError) {
                if (isActive) setDetailError(requestError.message || 'Unable to load this Program.')
            } finally {
                if (isActive) setIsDetailLoading(false)
            }
        }

        loadProgram()
        return () => { isActive = false }
    }, [selectedProgramId, refreshKey])

    useEffect(() => {
        let isActive = true

        async function loadApplication() {
            if (!selectedProgramId || !selectedApplicationId) return

            try {
                setIsDetailLoading(true)
                setDetailError('')
                const response = await fetch(`${API_URL}/${encodeURIComponent(selectedProgramId)}/applications/${encodeURIComponent(selectedApplicationId)}`, { credentials: 'include' })
                if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load this application.'))
                const data = await response.json()
                if (isActive) setApplication(data)
            } catch (requestError) {
                if (isActive) setDetailError(requestError.message || 'Unable to load this application.')
            } finally {
                if (isActive) setIsDetailLoading(false)
            }
        }

        loadApplication()
        return () => { isActive = false }
    }, [selectedProgramId, selectedApplicationId, refreshKey])

    useEffect(() => {
        if (!toast) return undefined
        const timeoutId = setTimeout(() => setToast(''), 4000)
        return () => clearTimeout(timeoutId)
    }, [toast])

    useEffect(() => {
        if (!coverFile) return undefined
        const objectUrl = URL.createObjectURL(coverFile)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCoverPreview(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [coverFile])

    function openProgram(programId) {
        setProgram(null)
        setSelectedApplicationId(null)
        setApplication(null)
        setDetailError('')
        setSelectedProgramId(programId)
    }

    function closeProgram() {
        setSelectedProgramId(null)
        setProgram(null)
        setSelectedApplicationId(null)
        setApplication(null)
    }

    function openApplication(applicationId) {
        setApplication(null)
        setDetailError('')
        setSelectedApplicationId(applicationId)
    }

    function closeApplication() {
        setSelectedApplicationId(null)
        setApplication(null)
        setDetailError('')
    }

    function openForm() {
        setForm(EMPTY_FORM)
        setCoverFile(null)
        setCoverPreview('')
        setFormError('')
        setIsFormOpen(true)
    }

    function updateRequirement(index, value) {
        setForm((current) => ({
            ...current,
            requirements: current.requirements.map((item, itemIndex) => (itemIndex === index ? value : item)),
        }))
    }

    function removeRequirement(index) {
        setForm((current) => ({
            ...current,
            requirements: current.requirements.filter((_, itemIndex) => itemIndex !== index),
        }))
    }

    function updateBenefit(index, field, value) {
        setForm((current) => ({
            ...current,
            benefits: current.benefits.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
        }))
    }

    function removeBenefit(index) {
        setForm((current) => ({
            ...current,
            benefits: current.benefits.filter((_, itemIndex) => itemIndex !== index),
        }))
    }

    async function submitProgram(event) {
        event.preventDefault()
        const requirements = form.requirements.map((item) => item.trim()).filter(Boolean)
        const benefits = form.benefits
            .map((item) => ({ name: item.name.trim(), description: item.description.trim() }))
            .filter((item) => item.name)

        if (!form.name.trim() || !form.description.trim() || !form.deadline) {
            setFormError('Program name, description, and application deadline are required.')
            return
        }

        const body = new FormData()
        body.append('name', form.name.trim())
        body.append('description', form.description.trim())
        body.append('deadline', form.deadline)
        body.append('requirements', JSON.stringify(requirements))
        body.append('benefits', JSON.stringify(benefits))
        if (coverFile) body.append('cover', coverFile)

        try {
            setIsSaving(true)
            setFormError('')
            const response = await fetch(API_URL, { method: 'POST', credentials: 'include', body })
            if (!response.ok) throw new Error(await responseMessage(response, 'Unable to create this Program.'))
            const created = await response.json()

            setIsFormOpen(false)
            setToast(`Program created. Program code: ${created.code}`)
            setRefreshKey((currentKey) => currentKey + 1)
        } catch (requestError) {
            setFormError(requestError.message || 'Unable to create this Program.')
        } finally {
            setIsSaving(false)
        }
    }

    async function reviewApplication(action) {
        if (!application || application.status !== 'PENDING') return

        const reason = rejectionReason.trim()
        if (action === 'reject' && !reason) return

        try {
            setIsSaving(true)
            setDetailError('')
            const response = await fetch(`${API_URL}/${encodeURIComponent(selectedProgramId)}/applications/${encodeURIComponent(selectedApplicationId)}/${action}`, {
                method: 'PUT',
                credentials: 'include',
                headers: action === 'reject' ? { 'Content-Type': 'application/json' } : undefined,
                body: action === 'reject' ? JSON.stringify({ rejectionReason: reason }) : undefined,
            })
            if (!response.ok) throw new Error(await responseMessage(response, `Unable to ${action} this application.`))

            setIsRejectModalOpen(false)
            setRejectionReason('')
            setToast(action === 'approve' ? 'Farmer approved for this Program.' : 'Application rejected.')
            setRefreshKey((currentKey) => currentKey + 1)
        } catch (requestError) {
            setDetailError(requestError.message || `Unable to ${action} this application.`)
        } finally {
            setIsSaving(false)
        }
    }

    const toastNode = toast && <div className="admin-toast admin-toast-success" role="status">{toast}</div>

    if (selectedProgramId && selectedApplicationId) {
        const canReview = application?.status === 'PENDING'

        return (
            <section className="admin-detail-page">
                {toastNode}
                <div className="admin-detail-heading">
                    <div>
                        <button type="button" className="admin-back-link farmer-review-back" onClick={closeApplication}>Back to Program</button>
                        <p className="admin-eyebrow">PROGRAM APPLICATION</p>
                        <h2>{application ? getFarmerName(application) : 'Farmer application'}</h2>
                    </div>
                    {application && <span className={statusClass(application.status)}>{application.status}</span>}
                </div>

                {detailError && <p className="admin-alert admin-alert-error" role="alert">{detailError}</p>}
                {isDetailLoading && !application ? <p className="admin-loading">Loading application...</p> : application && (
                    <>
                        <div className="admin-program-farmer-head">
                            <ProtectedImage className="admin-program-avatar admin-program-avatar-lg" url={application.profilePictureUrl} alt={getFarmerName(application)} />
                            <InfoGrid items={[
                                ['Mobile number', application.mobileNumber],
                                ['Farm code', application.farmCode],
                                ['RSBSA number', application.rsbsaNumber],
                                ['Applied', formatDate(application.appliedAt)],
                            ]} />
                        </div>

                        <section className="admin-panel">
                            <h3>Submitted documents</h3>
                            {(application.documents || []).map((document) => (
                                <div key={document.requirementId} className="admin-program-document">
                                    <h4>{document.requirementName}</h4>
                                    <DocumentPreview url={document.fileUrl} label={document.requirementName} />
                                </div>
                            ))}
                            {!(application.documents || []).length && <p className="farmer-review-selfie-empty">This Program has no document requirements.</p>}
                        </section>

                        {application.rejectionReason && (
                            <p className="admin-alert admin-alert-error"><strong>Rejection reason:</strong> {application.rejectionReason}</p>
                        )}

                        <div className="admin-review-actions">
                            <button type="button" className="admin-button admin-button-secondary" onClick={closeApplication}>Close</button>
                            <button type="button" className="admin-button admin-button-danger" disabled={!canReview || isSaving} onClick={() => setIsRejectModalOpen(true)}>Reject</button>
                            <button type="button" className="admin-button admin-button-primary" disabled={!canReview || isSaving} onClick={() => reviewApplication('approve')}>Approve</button>
                        </div>
                    </>
                )}

                {isRejectModalOpen && (
                    <div className="admin-modal-backdrop" role="presentation">
                        <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="program-reject-title">
                            <div className="admin-modal-heading">
                                <div>
                                    <p className="admin-eyebrow">PROGRAM APPLICATION</p>
                                    <h3 id="program-reject-title">Reject application</h3>
                                </div>
                                <button className="admin-modal-close" type="button" aria-label="Close rejection dialog" onClick={() => setIsRejectModalOpen(false)}>×</button>
                            </div>
                            <label className="admin-modal-label" htmlFor="program-rejection-reason">Reason for rejection</label>
                            <textarea
                                id="program-rejection-reason"
                                className="admin-modal-input"
                                value={rejectionReason}
                                onChange={(event) => setRejectionReason(event.target.value)}
                                rows="4"
                                autoFocus
                            />
                            <div className="admin-modal-actions">
                                <button className="admin-button admin-button-secondary" type="button" onClick={() => setIsRejectModalOpen(false)}>Cancel</button>
                                <button className="admin-button admin-button-danger" type="button" disabled={!rejectionReason.trim() || isSaving} onClick={() => reviewApplication('reject')}>Confirm rejection</button>
                            </div>
                        </section>
                    </div>
                )}
            </section>
        )
    }

    if (selectedProgramId) {
        return (
            <section className="admin-detail-page">
                {toastNode}
                <div className="admin-detail-heading">
                    <div>
                        <button type="button" className="admin-back-link farmer-review-back" onClick={closeProgram}>Back to Programs</button>
                        <p className="admin-eyebrow">PROGRAM</p>
                        <h2>{program?.name || 'Program'}</h2>
                    </div>
                    {program && <span className={statusClass(program.status)}>{program.status}</span>}
                </div>

                {detailError && <p className="admin-alert admin-alert-error" role="alert">{detailError}</p>}
                {isDetailLoading && !program ? <p className="admin-loading">Loading Program...</p> : program && (
                    <>
                        <div className="admin-detail-grid">
                            <section className="admin-panel">
                                <h3>Program information</h3>
                                <InfoGrid items={[
                                    ['Program code', program.code],
                                    ['Application deadline', formatDate(program.deadline)],
                                    ['Created', formatDate(program.createdAt)],
                                    ['Registered farmers', program.applicants?.length ?? 0],
                                    ['Approved farmers', (program.applicants || []).filter((item) => item.status === 'APPROVED').length],
                                ]} />
                                <p>{program.description}</p>
                            </section>
                            <section className="admin-panel">
                                <h3>Cover / poster</h3>
                                <ProtectedImage className="admin-program-cover" url={program.coverUrl} alt={`${program.name} cover`} />
                                <h3>Required documents</h3>
                                <ul>
                                    {(program.requirements || []).map((requirement) => <li key={requirement.id}>{requirement.name}</li>)}
                                    {!(program.requirements || []).length && <li>None</li>}
                                </ul>
                                <h3>Benefits</h3>
                                <ul>
                                    {(program.benefits || []).map((benefit) => (
                                        <li key={benefit.id}><strong>{benefit.name}</strong>{benefit.description ? ` - ${benefit.description}` : ''}</li>
                                    ))}
                                    {!(program.benefits || []).length && <li>None</li>}
                                </ul>
                            </section>
                        </div>

                        <section className="admin-panel">
                            <h3>Registered farmers</h3>
                            <div className="admin-program-farmer-grid">
                                {(program.applicants || []).map((applicant) => (
                                    <button key={applicant.applicationId} type="button" className="admin-program-farmer-card" onClick={() => openApplication(applicant.applicationId)}>
                                        <ProtectedImage className="admin-program-avatar" url={applicant.profilePictureUrl} alt={getFarmerName(applicant)} />
                                        <strong>{getFarmerName(applicant)}</strong>
                                        <span className={statusClass(applicant.status)}>{applicant.status}</span>
                                    </button>
                                ))}
                                {!(program.applicants || []).length && <p className="farmer-review-selfie-empty">No farmers have registered yet.</p>}
                            </div>
                        </section>
                    </>
                )}
            </section>
        )
    }

    return (
        <section className="admin-fo-page">
            {toastNode}
            <div className="admin-fo-header">
                <div>
                    <p className="admin-eyebrow">BENEFITS</p>
                    <h2>Programs</h2>
                    <p className="admin-section-description">Create Programs and benefits for Farmers. Past Programs are kept and never deleted.</p>
                </div>
                <div className="admin-fo-controls">
                    <label>
                        <span>View</span>
                        <select value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
                            <option value="grid">Grid</option>
                            <option value="list">List</option>
                        </select>
                    </label>
                    <button type="button" className="admin-button admin-button-primary" onClick={openForm}>Create Program</button>
                </div>
            </div>

            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
            {isLoading ? <p className="admin-loading">Loading Programs...</p> : viewMode === 'grid' ? (
                <div className="admin-program-grid">
                    {programs.map((item) => (
                        <button key={item.id} type="button" className="admin-program-card" onClick={() => openProgram(item.id)}>
                            <ProtectedImage className="admin-program-card-cover" url={item.coverUrl} alt={`${item.name} cover`} />
                            <div className="admin-program-card-body">
                                <span className={statusClass(item.status)}>{item.status}</span>
                                <strong>{item.name}</strong>
                                <span>Code: {valueOrDash(item.code)}</span>
                                <span>Deadline: {formatDate(item.deadline)}</span>
                                <span>{item.applicantCount ?? 0} registered · {item.approvedCount ?? 0} approved</span>
                            </div>
                        </button>
                    ))}
                    {!programs.length && <p className="admin-table-empty">No Programs yet. Create the first one.</p>}
                </div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-data-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Program</th>
                                <th>Code</th>
                                <th>Deadline</th>
                                <th>Registered</th>
                                <th>Approved</th>
                            </tr>
                        </thead>
                        <tbody>
                            {programs.map((item) => (
                                <tr key={item.id}>
                                    <td><span className={statusClass(item.status)}>{item.status}</span></td>
                                    <td><button type="button" className="farmer-review-name-link" onClick={() => openProgram(item.id)}>{item.name}</button></td>
                                    <td>{valueOrDash(item.code)}</td>
                                    <td>{formatDate(item.deadline)}</td>
                                    <td>{item.applicantCount ?? 0}</td>
                                    <td>{item.approvedCount ?? 0}</td>
                                </tr>
                            ))}
                            {!programs.length && <tr><td className="admin-table-empty" colSpan="6">No Programs yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {isFormOpen && (
                <div className="admin-modal-backdrop" role="presentation">
                    <form className="admin-modal admin-program-form" role="dialog" aria-modal="true" aria-labelledby="program-form-title" onSubmit={submitProgram}>
                        <div className="admin-modal-heading">
                            <div>
                                <p className="admin-eyebrow">NEW PROGRAM</p>
                                <h3 id="program-form-title">Create Program</h3>
                            </div>
                            <button className="admin-modal-close" type="button" aria-label="Close" onClick={() => setIsFormOpen(false)}>×</button>
                        </div>

                        <label className="admin-modal-label" htmlFor="program-name">Program name</label>
                        <input id="program-name" className="admin-modal-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />

                        <label className="admin-modal-label" htmlFor="program-description">Description</label>
                        <textarea id="program-description" className="admin-modal-input" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />

                        <label className="admin-modal-label" htmlFor="program-deadline">Application deadline</label>
                        <input id="program-deadline" type="datetime-local" className="admin-modal-input" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />

                        <label className="admin-modal-label" htmlFor="program-cover">Cover / poster photo</label>
                        <input id="program-cover" type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} />
                        {coverFile && coverPreview && <img className="admin-program-cover" src={coverPreview} alt="Cover preview" />}

                        <p className="admin-modal-label">Eligibility requirements (files each Farmer must submit)</p>
                        {form.requirements.map((requirement, index) => (
                            <div key={index} className="admin-program-requirement-row">
                                <input
                                    className="admin-modal-input"
                                    value={requirement}
                                    placeholder={`Document ${index + 1} name, e.g. Barangay Certificate`}
                                    onChange={(event) => updateRequirement(index, event.target.value)}
                                />
                                <button type="button" className="admin-button admin-button-secondary" onClick={() => removeRequirement(index)}>Remove</button>
                            </div>
                        ))}
                        <button type="button" className="admin-button admin-button-secondary" onClick={() => setForm({ ...form, requirements: [...form.requirements, ''] })}>Add required document</button>

                        <p className="admin-modal-label">Benefits (e.g. cash assistance, fertilizer)</p>
                        {form.benefits.map((benefit, index) => (
                            <div key={index} className="admin-program-benefit-row">
                                <input
                                    className="admin-modal-input"
                                    value={benefit.name}
                                    placeholder="Benefit name, e.g. Fertilizer"
                                    onChange={(event) => updateBenefit(index, 'name', event.target.value)}
                                />
                                <input
                                    className="admin-modal-input"
                                    value={benefit.description}
                                    placeholder="Details, e.g. 2 bags per hectare"
                                    onChange={(event) => updateBenefit(index, 'description', event.target.value)}
                                />
                                <button type="button" className="admin-button admin-button-secondary" onClick={() => removeBenefit(index)}>Remove</button>
                            </div>
                        ))}
                        <button type="button" className="admin-button admin-button-secondary" onClick={() => setForm({ ...form, benefits: [...form.benefits, { name: '', description: '' }] })}>Add benefit</button>

                        {formError && <p className="admin-alert admin-alert-error" role="alert">{formError}</p>}
                        <div className="admin-modal-actions">
                            <button className="admin-button admin-button-secondary" type="button" onClick={() => setIsFormOpen(false)}>Cancel</button>
                            <button className="admin-button admin-button-primary" type="submit" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Program'}</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    )
}

export default AdminPrograms
