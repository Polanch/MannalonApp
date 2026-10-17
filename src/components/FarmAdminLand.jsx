import { useEffect, useState } from 'react'
import FarmLocationEditor from './FarmLocationEditor.jsx'

const API_URL = 'http://localhost:8080/api/farm-admin'

const FARM_TYPES = ['Rice Farm', 'Rice-Based Farm', 'Other']
const IRRIGATION_TYPES = ['Irrigated', 'Rainfed', 'Other']
const OWNERSHIP_TYPES = ['Owner', 'Lessee', 'Tenant', 'Co-owner', 'Other']
const DOCUMENT_TYPES = [
    'Proof of Land Ownership',
    'Certificate of Title / Land Title',
    'Tax Declaration',
    'Lease Agreement',
    'Barangay Certification',
    'Other Supporting Document',
]

const defaultFormState = {
    farmName: '',
    farmArea: '',
    farmType: '',
    irrigationType: '',
    ownershipType: '',
    region: '',
    province: '',
    municipalityCity: '',
    barangay: '',
    sitio: '',
}

const emptyDocument = () => ({
    id: Date.now() + Math.random(),
    docType: '',
    docNumber: '',
    file: null,
    fileName: '',
})

function FarmAdminLand() {
    const [farms, setFarms] = useState([])
    const [view, setView] = useState('list')
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState(defaultFormState)
    const [documents, setDocuments] = useState([emptyDocument()])
    const [errorMessage, setErrorMessage] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submittedFarm, setSubmittedFarm] = useState(null)
    const [selectedFarm, setSelectedFarm] = useState(null)

    useEffect(() => {
        let isActive = true

        async function loadFarms() {
            try {
                setIsLoading(true)
                const response = await fetch(`${API_URL}/farms`, {
                    credentials: 'include',
                })
                if (!response.ok) throw new Error('Unable to load your farm registrations.')
                const data = await response.json()
                if (isActive) setFarms(Array.isArray(data) ? data : [])
            } catch (error) {
                if (isActive) setErrorMessage(error.message)
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        loadFarms()
        return () => { isActive = false }
    }, [])

    function resetForm() {
        setFormData(defaultFormState)
        setDocuments([emptyDocument()])
        setStep(1)
        setErrorMessage('')
    }

    function openAddFarm() {
        resetForm()
        setView('form')
    }

    function closeForm() {
        resetForm()
        setView('list')
    }

    function openFarmLocation(farm) {
        if (farm.status !== 'APPROVED' || !farm.farmId) return
        setSelectedFarm(farm)
        setErrorMessage('')
        setView('location')
    }

    function closeFarmLocation() {
        setSelectedFarm(null)
        setView('list')
    }

    function markFarmLocationSaved() {
        setFarms((currentFarms) => currentFarms.map((farm) => (
            farm.registrationId === selectedFarm?.registrationId
                ? { ...farm, hasGeolocation: true }
                : farm
        )))
        setSelectedFarm((farm) => farm ? { ...farm, hasGeolocation: true } : farm)
    }

    function updateFormField(event) {
        const { name, value } = event.target
        setFormData((currentData) => ({ ...currentData, [name]: value }))
    }

    function addDocumentRow() {
        setDocuments((currentDocuments) => [...currentDocuments, emptyDocument()])
    }

    function updateDocumentRow(documentId, field, value) {
        setDocuments((currentDocuments) => currentDocuments.map((document) => {
            if (document.id !== documentId) {
                return document
            }

            if (field === 'file') {
                return {
                    ...document,
                    file: value,
                    fileName: value ? value.name : '',
                }
            }

            return {
                ...document,
                [field]: value,
            }
        }))
    }

    function removeDocumentRow(documentId) {
        setDocuments((currentDocuments) => {
            if (currentDocuments.length === 1) {
                return [emptyDocument()]
            }

            return currentDocuments.filter((document) => document.id !== documentId)
        })
    }

    function validateStep(stepNumber) {
        if (stepNumber === 1) {
            return formData.farmName.trim() !== ''
                && formData.farmArea !== ''
                && Number(formData.farmArea) > 0
                && formData.farmType !== ''
                && formData.irrigationType !== ''
                && formData.ownershipType !== ''
        }

        if (stepNumber === 2) {
            return formData.region.trim() !== ''
                && formData.province.trim() !== ''
                && formData.municipalityCity.trim() !== ''
                && formData.barangay.trim() !== ''
        }

        if (stepNumber === 3) {
            const validRows = documents.filter((document) => document.docType || document.docNumber.trim() || document.fileName)

            if (!validRows.length) {
                return false
            }

            return validRows.every((document) => document.docType && document.docNumber.trim() && document.fileName)
        }

        return true
    }

    function goToNextStep() {
        if (!validateStep(step)) {
            setErrorMessage('Please complete all required fields before proceeding.')
            return
        }

        setErrorMessage('')
        setStep((currentStep) => Math.min(currentStep + 1, 4))
    }

    function goToPreviousStep() {
        setErrorMessage('')
        setStep((currentStep) => Math.max(currentStep - 1, 1))
    }

    async function submitFarmRegistration() {
        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            setErrorMessage('Please complete the required farm information, address, and document details before submitting.')
            return
        }

        const registrationData = new FormData()
        registrationData.append('farmName', formData.farmName.trim())
        registrationData.append('areaHectares', formData.farmArea)
        registrationData.append('farmType', formData.farmType)
        registrationData.append('irrigationType', formData.irrigationType)
        registrationData.append('ownershipType', formData.ownershipType)
        registrationData.append('region', formData.region.trim())
        registrationData.append('province', formData.province.trim())
        registrationData.append('municipalityCity', formData.municipalityCity.trim())
        registrationData.append('barangay', formData.barangay.trim())
        registrationData.append('sitio', formData.sitio.trim())
        documents.forEach((document, index) => {
            registrationData.append(`documents[${index}].documentType`, document.docType)
            registrationData.append(`documents[${index}].documentNumber`, document.docNumber.trim())
            registrationData.append(`documents[${index}].file`, document.file)
        })

        try {
            setIsSubmitting(true)
            setErrorMessage('')
            const response = await fetch(`${API_URL}/registrations`, {
                method: 'POST',
                credentials: 'include',
                body: registrationData,
            })
            if (!response.ok) {
                const responseBody = await response.json().catch(() => null)
                throw new Error(responseBody?.message || responseBody?.error || 'Unable to submit your farm registration.')
            }

            const registration = await response.json()
            const newFarm = {
                ...registration,
                createdAt: registration.submittedAt,
            }
            setFarms((currentFarms) => [newFarm, ...currentFarms])
            setSubmittedFarm(newFarm)
            setView('success')
            resetForm()
        } catch (error) {
            setErrorMessage(error.message || 'Unable to submit your farm registration.')
        } finally {
            setIsSubmitting(false)
        }
    }

    function renderListView() {
        const hasFarms = farms.length > 0

        return (
            <div className="farm-admin-land-panel">
                <div className="farm-admin-land-header-row">
                    <div>
                        <p className="farm-admin-eyebrow">LAND MANAGEMENT</p>
                        <h2>My Registered Farms</h2>
                    </div>
                    <button type="button" className="farm-admin-primary-button" onClick={openAddFarm}>+ Add</button>
                </div>

                <div className="farm-admin-land-table-wrap">
                    {isLoading ? <p className="farm-admin-loading">Loading farm registrations...</p> : hasFarms ? (
                        <div className="fa-card-grid">
                            {farms.map((farm) => (
                                <button
                                    key={farm.registrationId}
                                    type="button"
                                    className={`fa-card${farm.status === 'APPROVED' && farm.farmId ? '' : ' is-disabled'}`}
                                    onClick={() => openFarmLocation(farm)}
                                    disabled={farm.status !== 'APPROVED' || !farm.farmId}
                                >
                                    <div className="fa-card-top">
                                        <span className={`status-badge status-${farm.status.toLowerCase()}`}>{farm.status}</span>
                                        <span className="fa-card-id">{farm.farmCode || 'No code yet'}</span>
                                    </div>
                                    <strong className="fa-card-title">{farm.farmName}</strong>
                                    <dl className="fa-card-meta">
                                        <dt>Submitted</dt><dd>{farm.createdAt ? new Date(farm.createdAt).toLocaleDateString() : '—'}</dd>
                                        {farm.rejectionReason && <><dt>Reason</dt><dd>{farm.rejectionReason}</dd></>}
                                        {farm.status === 'APPROVED' && (
                                            <><dt>Map location</dt><dd>{farm.hasGeolocation ? 'Added' : 'Required — click to add'}</dd></>
                                        )}
                                    </dl>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="farm-admin-empty-state">
                            <div className="farm-admin-empty-card">
                                <h3>You have no Farm Registered</h3>
                                <button type="button" className="farm-admin-primary-button" onClick={openAddFarm}>+ Add</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    function renderFormView() {
        return (
            <div className="farm-admin-land-panel farm-admin-form-panel">
                <div className="farm-admin-form-head">
                    <div>
                        <p className="farm-admin-eyebrow">REGISTRATION</p>
                        <h2>Register Farm</h2>
                    </div>
                    <button type="button" className="farm-admin-secondary-button" onClick={closeForm}>Cancel</button>
                </div>

                <div className="farm-admin-stepper" aria-label="Registration progress">
                    {[1, 2, 3, 4].map((value) => (
                        <span key={value} className={value <= step ? 'farm-admin-step active' : 'farm-admin-step'}>
                            {value}
                        </span>
                    ))}
                </div>

                {errorMessage && <div className="farm-admin-error-banner" role="alert">{errorMessage}</div>}

                <div className="farm-admin-form-body">
                    {step === 1 && (
                        <div className="farm-admin-form-step">
                            <h3>Farm Information</h3>
                            <div className="farm-admin-form-grid">
                                <label className="farm-admin-field">
                                    <span>Farm Name <em>*</em></span>
                                    <input type="text" name="farmName" value={formData.farmName} onChange={updateFormField} placeholder="Enter farm name" />
                                </label>
                                <label className="farm-admin-field">
                                    <span>Farm Area (hectares) <em>*</em></span>
                                    <input type="number" min="0.01" step="0.01" name="farmArea" value={formData.farmArea} onChange={updateFormField} placeholder="e.g. 12.5" />
                                </label>
                                <label className="farm-admin-field">
                                    <span>Farm Type <em>*</em></span>
                                    <select name="farmType" value={formData.farmType} onChange={updateFormField}>
                                        <option value="">Select farm type</option>
                                        {FARM_TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="farm-admin-field">
                                    <span>Irrigation Type <em>*</em></span>
                                    <select name="irrigationType" value={formData.irrigationType} onChange={updateFormField}>
                                        <option value="">Select irrigation type</option>
                                        {IRRIGATION_TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="farm-admin-field full-width">
                                    <span>Ownership / Tenure Type <em>*</em></span>
                                    <select name="ownershipType" value={formData.ownershipType} onChange={updateFormField}>
                                        <option value="">Select ownership</option>
                                        {OWNERSHIP_TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="farm-admin-form-step">
                            <h3>Farm Address</h3>
                            <div className="farm-admin-form-grid">
                                <label className="farm-admin-field">
                                    <span>Region <em>*</em></span>
                                    <input type="text" name="region" value={formData.region} onChange={updateFormField} placeholder="Enter region" />
                                </label>
                                <label className="farm-admin-field">
                                    <span>Province <em>*</em></span>
                                    <input type="text" name="province" value={formData.province} onChange={updateFormField} placeholder="Enter province" />
                                </label>
                                <label className="farm-admin-field">
                                    <span>Municipality / City <em>*</em></span>
                                    <input type="text" name="municipalityCity" value={formData.municipalityCity} onChange={updateFormField} placeholder="Enter municipality / city" />
                                </label>
                                <label className="farm-admin-field">
                                    <span>Barangay <em>*</em></span>
                                    <input type="text" name="barangay" value={formData.barangay} onChange={updateFormField} placeholder="Enter barangay" />
                                </label>
                                <label className="farm-admin-field full-width">
                                    <span>Sitio / Purok</span>
                                    <input type="text" name="sitio" value={formData.sitio} onChange={updateFormField} placeholder="Optional" />
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="farm-admin-form-step">
                            <h3>Document Submission</h3>
                            <div className="farm-admin-documents">
                                {documents.map((document, index) => (
                                    <div key={document.id} className="farm-admin-document-card">
                                        <div className="farm-admin-document-header">
                                            <span>Supporting Document {index + 1}</span>
                                            {documents.length > 1 && (
                                                <button type="button" className="farm-admin-link-button" onClick={() => removeDocumentRow(document.id)}>Remove</button>
                                            )}
                                        </div>

                                        <div className="farm-admin-document-fields">
                                            <label className="farm-admin-field">
                                                <span>Document Type <em>*</em></span>
                                                <select value={document.docType} onChange={(event) => updateDocumentRow(document.id, 'docType', event.target.value)}>
                                                    <option value="">Select document</option>
                                                    {DOCUMENT_TYPES.map((type) => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="farm-admin-field">
                                                <span>Document Number <em>*</em></span>
                                                <input type="text" value={document.docNumber} onChange={(event) => updateDocumentRow(document.id, 'docNumber', event.target.value)} placeholder="Enter document number" />
                                            </label>
                                            <label className="farm-admin-field full-width">
                                                <span>File <em>*</em></span>
                                                <input type="file" onChange={(event) => updateDocumentRow(document.id, 'file', event.target.files?.[0] || null)} />
                                                {document.fileName && <small>{document.fileName}</small>}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" className="farm-admin-secondary-button add-document-button" onClick={addDocumentRow}>+ Add another document</button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="farm-admin-form-step">
                            <h3>Review</h3>
                            <div className="farm-admin-review-section">
                                <h4>Farm Information</h4>
                                <ul>
                                    <li><strong>Farm Name:</strong> {formData.farmName || '—'}</li>
                                    <li><strong>Farm Area:</strong> {formData.farmArea ? `${Number(formData.farmArea).toLocaleString('en-US')} hectares` : '—'}</li>
                                    <li><strong>Farm Type:</strong> {formData.farmType || '—'}</li>
                                    <li><strong>Irrigation Type:</strong> {formData.irrigationType || '—'}</li>
                                    <li><strong>Ownership / Tenure:</strong> {formData.ownershipType || '—'}</li>
                                </ul>
                            </div>

                            <div className="farm-admin-review-section">
                                <h4>Farm Address</h4>
                                <ul>
                                    <li><strong>Region:</strong> {formData.region || '—'}</li>
                                    <li><strong>Province:</strong> {formData.province || '—'}</li>
                                    <li><strong>Municipality / City:</strong> {formData.municipalityCity || '—'}</li>
                                    <li><strong>Barangay:</strong> {formData.barangay || '—'}</li>
                                    <li><strong>Sitio / Purok:</strong> {formData.sitio || '—'}</li>
                                </ul>
                            </div>

                            <div className="farm-admin-review-section">
                                <h4>Documents</h4>
                                <ul>
                                    {documents
                                        .filter((document) => document.docType || document.docNumber || document.fileName)
                                        .map((document) => (
                                            <li key={document.id}>
                                                <strong>{document.docType || 'Document'}:</strong> {document.docNumber || '—'}
                                                {document.fileName ? ` — ${document.fileName}` : ''}
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="farm-admin-form-actions">
                    {step === 1 ? (
                        <button type="button" className="farm-admin-secondary-button" onClick={closeForm}>Cancel</button>
                    ) : (
                        <button type="button" className="farm-admin-secondary-button" onClick={goToPreviousStep}>Back</button>
                    )}

                    {step < 4 ? (
                        <button type="button" className="farm-admin-primary-button" onClick={goToNextStep}>Next</button>
                    ) : (
                        <button type="button" className="farm-admin-primary-button" onClick={submitFarmRegistration} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Farm Registration'}
                        </button>
                    )}
                </div>
            </div>
        )
    }

    function renderSuccessView() {
        return (
            <div className="farm-admin-land-panel farm-admin-success-panel">
                <div className="farm-admin-success-icon">✓</div>
                <h2>Farm Registration Submitted</h2>
                <p>Your farm registration has been submitted and is now pending review.</p>
                <div className="farm-admin-success-status">
                    <span>Status:</span>
                    <span className={`status-badge status-${String(submittedFarm?.status || 'PENDING').toLowerCase()}`}>{submittedFarm?.status || 'PENDING'}</span>
                </div>
                <div className="farm-admin-success-meta">
                    <span>Farm Code:</span>
                    <strong>{submittedFarm?.farmCode || '—'}</strong>
                </div>
                <button type="button" className="farm-admin-primary-button" onClick={() => setView('list')}>Back to My Farms</button>
            </div>
        )
    }

    function renderLocationView() {
        return (
            <div className="farm-admin-land-panel">
                <div className="farm-admin-land-header-row">
                    <div>
                        <p className="farm-admin-eyebrow">APPROVED FARM</p>
                        <h2>{selectedFarm?.farmName}</h2>
                        <p className="farm-admin-location-intro">
                            {selectedFarm?.hasGeolocation
                                ? 'Review or update this farm’s exact map location.'
                                : 'This farm is approved. Add its exact map location to complete the setup.'}
                        </p>
                    </div>
                    <button type="button" className="farm-admin-secondary-button" onClick={closeFarmLocation}>Back to farms</button>
                </div>
                <FarmLocationEditor farmId={selectedFarm?.farmId} onSaved={markFarmLocationSaved} />
            </div>
        )
    }

    if (view === 'form') {
        return <div className="farm-admin-land"> {renderFormView()} </div>
    }

    if (view === 'success') {
        return <div className="farm-admin-land"> {renderSuccessView()} </div>
    }

    if (view === 'location') {
        return <div className="farm-admin-land"> {renderLocationView()} </div>
    }

    return <div className="farm-admin-land"> {renderListView()} </div>
}

export default FarmAdminLand