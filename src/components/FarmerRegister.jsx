import { useEffect, useRef, useState } from 'react'

const initialFormData = {
    farmCode: '',
    mobileNumber: '',
    password: '',
    lastName: '',
    firstName: '',
    middleName: '',
    birthdate: '',
    civilStatus: '',
    gender: '',
    houseLotBlock: '',
    street: '',
    barangay: '',
    municipalityCity: '',
    province: '',
    region: '',
    zipCode: '',
}

function FarmerRegister({ onCancel, onSubmitRegistration }) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState(initialFormData)
    const [cameraStream, setCameraStream] = useState(null)
    const [cameraError, setCameraError] = useState('')
    const [selfie, setSelfie] = useState(null)
    const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('')
    const [isSelfieAccepted, setIsSelfieAccepted] = useState(false)
    const [isVerifyingFarmCode, setIsVerifyingFarmCode] = useState(false)
    const [isFarmCodeVerified, setIsFarmCodeVerified] = useState(false)
    const [registrationError, setRegistrationError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const videoRef = useRef(null)
    const streamRef = useRef(null)

    useEffect(() => () => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
    }, [])

    useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream
        }
    }, [cameraStream])

    useEffect(() => {
        if (!selfie) {
            setSelfiePreviewUrl('')
            return undefined
        }

        const previewUrl = URL.createObjectURL(selfie)
        setSelfiePreviewUrl(previewUrl)
        return () => URL.revokeObjectURL(previewUrl)
    }, [selfie])

    function updateField(event) {
        const { name, value } = event.target
        const fieldValue = name === 'mobileNumber'
            ? value.replace(/\D/g, '').slice(0, 11)
            : value

        setFormData((currentData) => ({ ...currentData, [name]: fieldValue }))
        if (name === 'farmCode') {
            setIsFarmCodeVerified(false)
        }
    }

    function stopCamera() {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setCameraStream(null)
    }

    async function openCamera() {
        setCameraError('')

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError('Camera access is unavailable in this browser or page context.')
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false,
            })
            streamRef.current = stream
            setCameraStream(stream)
        } catch {
            setCameraError('Camera permission was denied or no camera is available.')
        }
    }

    function captureSelfie() {
        const video = videoRef.current
        if (!video?.videoWidth || !video.videoHeight) {
            setCameraError('The camera is not ready yet. Please try again.')
            return
        }

        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const context = canvas.getContext('2d')
        if (!context) {
            setCameraError('Could not capture the picture. Please try again.')
            return
        }

        context.drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
            if (!blob) {
                setCameraError('Could not capture the picture. Please try again.')
                return
            }

            setSelfie(new File([blob], 'farmer-selfie.jpg', { type: 'image/jpeg' }))
            setIsSelfieAccepted(false)
            setCameraError('')
            stopCamera()
        }, 'image/jpeg', 0.9)
    }

    async function handleContinue(event) {
        event.preventDefault()
        setRegistrationError('')

        if (step === 1) {
            const farmCode = formData.farmCode.trim()
            if (!farmCode) {
                setRegistrationError('Enter the Farm Code provided by your Farm-Admin.')
                return
            }

            setIsVerifyingFarmCode(true)
            try {
                const query = new URLSearchParams({ code: farmCode })
                const response = await fetch(`http://localhost:8080/api/farmer/verify-farm-code?${query}`)
                if (response.status === 404) {
                    setIsFarmCodeVerified(false)
                    setRegistrationError('Invalid Farm Code. Please check with your Farm-Admin.')
                    return
                }
                if (!response.ok) {
                    throw new Error('Unable to verify the Farm Code. Please try again.')
                }

                setFormData((currentData) => ({ ...currentData, farmCode }))
                setIsFarmCodeVerified(true)
                setStep(2)
            } catch (error) {
                setRegistrationError(error.message || 'Unable to verify the Farm Code. Please try again.')
            } finally {
                setIsVerifyingFarmCode(false)
            }
            return
        }

        if (step === 5) {
            if (!selfie || !isSelfieAccepted) {
                setRegistrationError('Capture and accept your selfie before submitting.')
                return
            }

            if (!onSubmitRegistration) {
                setRegistrationError('Registration is not connected yet. Your information has not been submitted.')
                return
            }

            setIsSubmitting(true)
            stopCamera()
            try {
                const registrationData = new FormData()
                Object.entries(formData).forEach(([name, value]) => {
                    registrationData.append(name, name === 'farmCode' ? value.trim() : value)
                })
                registrationData.append('selfie', selfie)
                await onSubmitRegistration(registrationData)
                setIsSubmitted(true)
            } catch (error) {
                setRegistrationError(
                    error.response?.data?.message ||
                    error.response?.data?.detail ||
                    error.response?.data?.error ||
                    error.message ||
                    'Registration could not be submitted. Please try again.'
                )
            } finally {
                setIsSubmitting(false)
            }
            return
        }

        setStep((currentStep) => currentStep + 1)
    }

    function handlePrevious() {
        if (step === 5) {
            stopCamera()
        }
        setStep((currentStep) => Math.max(1, currentStep - 1))
    }

    function renderField(name, label, type = 'text', required = true) {
        const fieldId = `farmer-register-${name}`

        return (
            <div className="farmer-register-field" key={name}>
                <label htmlFor={fieldId}>{label}{required ? ' *' : ''}</label>
                <input
                    id={fieldId}
                    name={name}
                    type={type}
                    value={formData[name]}
                    onChange={updateField}
                    required={required}
                    autoComplete="off"
                />
            </div>
        )
    }

    if (isSubmitted) {
        return (
            <div className="farmer-register-panel farmer-register-complete" role="status">
                <h2>Registration submitted</h2>
            <p>Registration submitted successfully. Your account is pending approval from your Farm-Admin.</p>
                <button type="button" className="farmer-register-back-login" onClick={onCancel}>
                    Return to Login
                </button>
            </div>
        )
    }

    return (
        <div className="farmer-register-panel">
            <form onSubmit={handleContinue}>
                <div className="farmer-register-step" key={step}>
                    <p className="farmer-register-progress">Step {step} of 5</p>

                    {step === 1 && (
                        <>
                            <h2>Farm Code</h2>
                            <p className="farmer-register-note">Enter the Farm Code provided to you by your Farm-Admin.</p>
                            {renderField('farmCode', 'Approved Farm Code')}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2>Account Details</h2>
                            <div className="farmer-register-field">
                                <label htmlFor="farmer-register-mobileNumber">Mobile Number *</label>
                                <input
                                    id="farmer-register-mobileNumber"
                                    name="mobileNumber"
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="09xxxxxxxxx"
                                    pattern="09[0-9]{9}"
                                    maxLength={11}
                                    value={formData.mobileNumber}
                                    onChange={updateField}
                                    autoComplete="tel"
                                    required
                                />
                            </div>
                            <div className="farmer-register-field">
                                <label htmlFor="farmer-register-password">Create Password *</label>
                                <input
                                    id="farmer-register-password"
                                    name="password"
                                    type="password"
                                    minLength={8}
                                    value={formData.password}
                                    onChange={updateField}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2>Personal Information</h2>
                            {renderField('lastName', 'Last Name')}
                            {renderField('firstName', 'First Name')}
                            {renderField('middleName', 'Middle Name', 'text', false)}
                            {renderField('birthdate', 'Birthdate', 'date')}
                            <div className="farmer-register-field">
                                <label htmlFor="farmer-register-civilStatus">Status *</label>
                                <select id="farmer-register-civilStatus" name="civilStatus" value={formData.civilStatus} onChange={updateField} required>
                                    <option value="">Select status</option>
                                    <option value="single">Single</option>
                                    <option value="married">Married</option>
                                    <option value="widowed">Widowed</option>
                                    <option value="separated">Separated</option>
                                    <option value="divorced">Divorced</option>
                                </select>
                            </div>
                            <div className="farmer-register-field">
                                <label htmlFor="farmer-register-gender">Gender *</label>
                                <select id="farmer-register-gender" name="gender" value={formData.gender} onChange={updateField} required>
                                    <option value="">Select gender</option>
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                </select>
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h2>Home Address</h2>
                            {renderField('houseLotBlock', 'House / Lot / Block', 'text', false)}
                            {renderField('street', 'Street', 'text', false)}
                            {renderField('barangay', 'Barangay')}
                            {renderField('municipalityCity', 'Municipality / City')}
                            {renderField('province', 'Province')}
                            {renderField('region', 'Region')}
                            {renderField('zipCode', 'ZIP Code', 'text', false)}
                        </>
                    )}

                    {step === 5 && (
                        <>
                            <h2>Selfie Verification</h2>
                            <p className="farmer-register-note">Take a selfie while holding your valid ID. Make sure your face and ID are clearly visible.</p>
                            {cameraStream && (
                                <video className="farmer-register-video" ref={videoRef} autoPlay playsInline muted />
                            )}
                            {selfiePreviewUrl && <img className="farmer-register-selfie" src={selfiePreviewUrl} alt="Captured verification selfie" />}
                            {!cameraStream && !selfie && (
                                <button type="button" className="farmer-register-camera-button" onClick={openCamera}>
                                    Take Selfie
                                </button>
                            )}
                            {cameraStream && (
                                <>
                                    <button type="button" className="farmer-register-camera-button" onClick={captureSelfie}>
                                        Capture
                                    </button>
                                    <button type="button" className="farmer-register-retake" onClick={stopCamera}>
                                        Close Camera
                                    </button>
                                </>
                            )}
                            {selfie && (
                                <>
                                    <button type="button" className="farmer-register-camera-button" onClick={() => setIsSelfieAccepted(true)} disabled={isSelfieAccepted}>
                                        {isSelfieAccepted ? 'Selfie Accepted' : 'Accept Selfie'}
                                    </button>
                                    <button type="button" className="farmer-register-retake" onClick={() => {
                                        setSelfie(null)
                                        setIsSelfieAccepted(false)
                                    }}>
                                        Retake Selfie
                                    </button>
                                </>
                            )}
                            {cameraError && <p className="farmer-register-error" role="alert">{cameraError}</p>}
                        </>
                    )}
                </div>

                {step === 5 && (
                    <p className="farmer-register-note">
                        Please read the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> before registering.
                        Optional AI chatbot questions and replies are sent to OpenAI and recorded for admin review
                        and possible future training-dataset preparation. A separate notice is shown in the chatbot.
                    </p>
                )}
                <div className="farmer-register-navigation">
                    {step > 1 ? (
                        <button type="button" className="farmer-register-secondary" onClick={handlePrevious}>Previous</button>
                    ) : (
                        <button type="button" className="farmer-register-secondary" onClick={onCancel}>Back to Login</button>
                    )}
                    <button type="submit" className="farmer-register-primary" disabled={isSubmitting || isVerifyingFarmCode || (step === 5 && (!selfie || !isSelfieAccepted))}>
                        {isSubmitting ? 'Submitting...' : isVerifyingFarmCode ? 'Checking Farm Code...' : step === 5 ? 'Submit Registration' : 'Continue'}
                    </button>
                </div>
                {step === 1 && isFarmCodeVerified && <p className="farmer-register-success" role="status">Farm Code verified.</p>}
                {registrationError && <p className="farmer-register-error" role="alert">{registrationError}</p>}
            </form>
        </div>
    )
}

export default FarmerRegister;