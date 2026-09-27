import { useEffect, useRef, useState } from 'react'

const initialFormData = {
    farmCode: '',
    mobileNumber: '',
    password: '',
    lastName: '',
    firstName: '',
    middleName: '',
    birthdate: '',
    status: '',
    gender: '',
    houseLotBlock: '',
    street: '',
    barangay: '',
    municipalityCity: '',
    province: '',
    region: '',
    zipCode: '',
}

function FarmerRegister({ onCancel }) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState(initialFormData)
    const [cameraStream, setCameraStream] = useState(null)
    const [cameraError, setCameraError] = useState('')
    const [selfie, setSelfie] = useState('')
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

    function updateField(event) {
        const { name, value } = event.target
        const fieldValue = name === 'mobileNumber'
            ? value.replace(/\D/g, '').slice(0, 11)
            : value

        setFormData((currentData) => ({ ...currentData, [name]: fieldValue }))
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
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        setSelfie(canvas.toDataURL('image/jpeg', 0.9))
        setCameraError('')
        stopCamera()
    }

    function handleContinue(event) {
        event.preventDefault()

        if (step === 5) {
            if (!selfie) {
                return
            }
            stopCamera()
            setIsSubmitted(true)
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
                <p>This is a demo. Your details and selfie were not sent to a server.</p>
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
                            <p className="farmer-register-note">Enter the approved Farm Code provided to you. Code approval is mocked for now.</p>
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
                                <label htmlFor="farmer-register-status">Status *</label>
                                <select id="farmer-register-status" name="status" value={formData.status} onChange={updateField} required>
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
                            <p className="farmer-register-note">Allow camera access, then take a clear selfie for verification.</p>
                            {cameraStream && (
                                <video className="farmer-register-video" ref={videoRef} autoPlay playsInline muted />
                            )}
                            {selfie && <img className="farmer-register-selfie" src={selfie} alt="Captured verification selfie" />}
                            {!cameraStream && !selfie && (
                                <button type="button" className="farmer-register-camera-button" onClick={openCamera}>
                                    Open Camera
                                </button>
                            )}
                            {cameraStream && (
                                <button type="button" className="farmer-register-camera-button" onClick={captureSelfie}>
                                    Take Selfie
                                </button>
                            )}
                            {selfie && (
                                <button type="button" className="farmer-register-retake" onClick={() => setSelfie('')}>
                                    Retake Selfie
                                </button>
                            )}
                            {cameraError && <p className="farmer-register-error" role="alert">{cameraError}</p>}
                        </>
                    )}
                </div>

                <div className="farmer-register-navigation">
                    {step > 1 ? (
                        <button type="button" className="farmer-register-secondary" onClick={handlePrevious}>Previous</button>
                    ) : (
                        <button type="button" className="farmer-register-secondary" onClick={onCancel}>Back to Login</button>
                    )}
                    <button type="submit" className="farmer-register-primary" disabled={step === 5 && !selfie}>
                        {step === 5 ? 'Submit' : 'Continue'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default FarmerRegister;