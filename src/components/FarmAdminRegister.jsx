import { useEffect, useState } from 'react'
import MannalonLogo from '../assets/images/MannalonLogo.png'
import emailicn from '../assets/images/email.png'

function FarmAdminRegister({ onLogin }){
    const maxFileSize = 5 * 1024 * 1024
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png']
    const [currentPhase, setCurrentPhase] = useState(1)
    const [isReturningToLogin, setIsReturningToLogin] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submissionError, setSubmissionError] = useState('')
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        surname: '',
        middleInitial: '',
        nameExtension: '',
        mobileNumber: '',
        personalEmail: '',
        houseLotBlock: '',
        street: '',
        barangay: '',
        municipalityCity: '',
        province: '',
        region: '',
        zipCode: '',
        idType: '',
        idFront: null,
        idBack: null,
        selfie: null,
    })

    useEffect(() => {
        if (!isReturningToLogin) {
            return undefined
        }

        const loginTimer = setTimeout(() => {
            setIsReturningToLogin(false)
            onLogin()
        }, 3000)

        return () => clearTimeout(loginTimer)
    }, [isReturningToLogin, onLogin])

    function updateField(event){
        const { name, value, files } = event.target
        setFormData((currentData) => ({
            ...currentData,
            [name]: files ? files[0] : value,
        }))
    }

    function updateAccountName(event){
        const accountName = event.target.value.split('@')[0]
        setFormData((currentData) => ({
            ...currentData,
            email: `${accountName}@mannalon.com`,
        }))
    }

    function keepCursorBeforeDomain(event){
        const accountNameLength = Math.max(0, event.currentTarget.value.indexOf('@'))
        const cursorPosition = Math.min(event.currentTarget.selectionStart, accountNameLength)
        event.currentTarget.setSelectionRange(cursorPosition, cursorPosition)
    }

    function removeFile(name){
        setFormData((currentData) => ({ ...currentData, [name]: null }))
    }

    function validateFiles(){
        const files = [
            ['idFront', formData.idFront],
            ['idBack', formData.idBack],
            ['selfie', formData.selfie],
        ]

        for (const [fieldName, file] of files) {
            if (!file) {
                return `${fieldName} is required.`
            }

            if (file.size > maxFileSize) {
                return `${file.name} is too large. Each image must be 5 MB or smaller.`
            }

            if (!allowedImageTypes.includes(file.type)) {
                return `${file.name} has an unsupported type. Use JPG or PNG images.`
            }
        }

        return ''
    }

    function isPhaseValid(){
        if (currentPhase === 1) {
            return /@mannalon\.com$/i.test(formData.email.trim())
                && formData.password.length > 0
                && formData.password === formData.confirmPassword
        }

        if (currentPhase === 2) {
            return formData.firstName.trim() !== ''
                && formData.surname.trim() !== ''
                && formData.mobileNumber.trim() !== ''
                && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail)
        }

        if (currentPhase === 3) {
            return formData.barangay.trim() !== ''
                && formData.municipalityCity.trim() !== ''
                && formData.province.trim() !== ''
                && formData.region.trim() !== ''
        }

        return formData.idType !== ''
            && formData.idFront !== null
            && formData.idBack !== null
            && formData.selfie !== null
    }

    function goToNextPhase(){
        if (!isPhaseValid()) {
            return
        }

        setCurrentPhase((phase) => phase + 1)
    }

    function goToPreviousPhase(){
        setCurrentPhase((phase) => Math.max(1, phase - 1))
    }

    async function submitRegistration(){
        if (!isPhaseValid() || isSubmitting) {
            return
        }

        const fileError = validateFiles()
        if (fileError) {
            setSubmissionError(fileError)
            return
        }

        setIsSubmitting(true)
        setSubmissionError('')

        try {
            const registrationData = new FormData()
            Object.entries(formData).forEach(([name, value]) => {
                registrationData.append(name, value)
            })

            const response = await fetch('http://localhost:8080/api/farm-admin-applications', {
                method: 'POST',
                body: registrationData,
            })

            if (!response.ok) {
                const responseBody = await response.json().catch(() => null)
                throw new Error(responseBody?.message || responseBody?.error || 'Account submission could not be completed.')
            }

            setCurrentPhase(5)
        } catch (error) {
            setSubmissionError(error.message || 'Account submission could not be completed.')
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleLogin(){
        setIsReturningToLogin(true)
    }

    function handleUnderstand(){
        window.location.reload()
    }

    function renderField(label, name, type = 'text', placeholder = ''){
        return (
            <div className="f-admin-group1" key={name}>
                <label htmlFor={name}>
                    <img src={emailicn} className="icn" />{label}
                </label>
                <input
                    type={type}
                    name={name}
                    id={name}
                    value={formData[name]}
                    onChange={updateField}
                    placeholder={placeholder}
                />
            </div>
        )
    }

    return(
        <div className="farm-admin-register-container">
            <form className={`f-register-phase ${currentPhase === 1 ? 'active' : ''}`} onSubmit={(event) => { event.preventDefault(); goToNextPhase() }}>
                <div className="register-phase-content">
                    <img src={MannalonLogo} className="register-logo" />
                    <div className="f-admin-group1">
                        <label htmlFor="accountName">
                            <img src={emailicn} className="icn" />Create Farm-Admin Account
                        </label>
                        <input
                            className="account-email-input"
                            type="text"
                            name="accountName"
                            id="accountName"
                            value={formData.email}
                            onChange={updateAccountName}
                            onClick={keepCursorBeforeDomain}
                            onSelect={keepCursorBeforeDomain}
                            placeholder="farmadmin01@mannalon.com"
                            autoComplete="username"
                        />
                    </div>
                    {renderField('New Password', 'password', 'password', 'Enter your password')}
                    {renderField('Confirm Password', 'confirmPassword', 'password', 'Enter your password')}
                </div>
                <div className="register-navigation next-only">
                    <button type="submit" disabled={!isPhaseValid()}>Next</button>
                </div>
            </form>
            <form className={`f-register-phase ${currentPhase === 2 ? 'active' : ''}`} onSubmit={(event) => { event.preventDefault(); goToNextPhase() }}>
                <h1>Personal Information</h1>
                <div className="register-phase-content">
                    <div className="register-fields">
                        {renderField('First name', 'firstName', 'text', 'Enter first name')}
                        {renderField('Surname', 'surname', 'text', 'Enter surname')}
                        {renderField('Middle initial', 'middleInitial', 'text', 'Enter middle initial')}
                        {renderField('Name extension (optional)', 'nameExtension', 'text', 'e.g. Jr.')}
                        {renderField('Mobile number', 'mobileNumber', 'tel', 'Enter mobile number')}
                        {renderField('Personal email', 'personalEmail', 'email', 'Enter personal email')}
                    </div>
                </div>
                <div className="register-navigation">
                    <button type="button" onClick={goToPreviousPhase}>Previous</button>
                    <button type="submit" disabled={!isPhaseValid()}>Next</button>
                </div>
            </form>
            <form className={`f-register-phase ${currentPhase === 3 ? 'active' : ''}`} onSubmit={(event) => { event.preventDefault(); goToNextPhase() }}>
                <h1>Permanent Home Address</h1>
                <div className="register-phase-content">
                    <div className="register-fields">
                        {renderField('House / Lot / Block no. (optional)', 'houseLotBlock', 'text', 'Enter house / lot / block')}
                        {renderField('Street (optional)', 'street', 'text', 'Enter street')}
                        {renderField('Barangay', 'barangay', 'text', 'Enter barangay')}
                        {renderField('Municipality / City', 'municipalityCity', 'text', 'Enter municipality / city')}
                        {renderField('Province', 'province', 'text', 'Enter province')}
                        {renderField('Region', 'region', 'text', 'Enter region')}
                        {renderField('ZIP code (optional)', 'zipCode', 'text', 'Enter ZIP code')}
                    </div>
                </div>
                <div className="register-navigation">
                    <button type="button" onClick={goToPreviousPhase}>Previous</button>
                    <button type="submit" disabled={!isPhaseValid()}>Next</button>
                </div>
            </form>
            <form className={`f-register-phase ${currentPhase === 4 ? 'active' : ''}`} onSubmit={(event) => { event.preventDefault(); submitRegistration() }}>
                <h1>Farm-Admin Verification</h1>
                <div className="register-phase-content document-phase-content">
                    <p className="account-setup-note">This creates your Farm-Admin account for approval. After approval, log in and use the Land section to register your farm.</p>
                    <div className="document-id-field">
                        <label htmlFor="idType"><img src={emailicn} className="icn" />ID type</label>
                    </div>
                    <select name="idType" id="idType" value={formData.idType} onChange={updateField}>
                        <option value="">Select ID type</option>
                        <option value="government_id">Government ID</option>
                        <option value="philhealth">PhilHealth ID</option>
                        <option value="drivers_license">Driver's license</option>
                    </select>
                    {[
                        ['idFront', 'Front of ID'],
                        ['idBack', 'Back of ID'],
                        ['selfie', 'Selfie / Face verification'],
                    ].map(([name, label]) => (
                        <div className="file-upload-group" key={name}>
                            <input type="file" name={name} id={name} onClick={(event) => { event.currentTarget.value = '' }} onChange={updateField} accept="image/*" />
                            <span className="file-name">
                                {formData[name] ? formData[name].name : 'No file selected'}
                            </span>
                            <div className="file-upload-actions">
                                <label className="file-upload-button" htmlFor={name}>
                                    <img src={emailicn} className="icn" />Upload {label}
                                </label>
                                {formData[name] && (
                                    <button type="button" className="remove-file-button" onClick={() => removeFile(name)}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="register-navigation">
                    <button type="button" onClick={goToPreviousPhase}>Previous</button>
                    <button type="submit" disabled={!isPhaseValid() || isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Proceed'}
                    </button>
                </div>
                {submissionError && <p className="registration-error" role="alert">{submissionError}</p>}
            </form>
            <div className={`f-register-phase submission-phase ${currentPhase === 5 ? 'active' : ''}`}>
                <h1>Farm-Admin Account Submitted</h1>
                <div className="submission-message">
                    <p>Your Farm-Admin account has been submitted for approval.</p>
                    <p>The admin team will review your application before you can log in.</p>
                    <p>Once approved, log in and use the Land section to register your farm.</p>
                </div>
                <button className="understand-button" type="button" onClick={handleUnderstand}>I Understand</button>
            </div>
            <div className="f-register-progress-tracker">
                {[1, 2, 3, 4].map((phase) => (
                    <span key={phase} className={currentPhase >= phase ? 'active' : ''}></span>
                ))}
            </div>
            <div className="register-login-link">
                <span>Already have an account?</span>{' '}
                <button type="button" onClick={handleLogin} disabled={isReturningToLogin}>
                    {isReturningToLogin ? (
                        <span className="loading-dots" aria-label="Returning to login">
                            <span></span><span></span><span></span>
                        </span>
                    ) : 'Login'}
                </button>
            </div>
        </div>
    )
}

export default FarmAdminRegister;