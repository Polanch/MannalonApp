import { useEffect, useRef, useState } from 'react'
import '../assets/styles/farmer.css'
import FarmerDashboardMiddleNavigation from './farmer_components/FarmerDashboardMiddleNavigation.jsx'
import { getFarmAdminSession } from '../services/farmAdminApi.js'

const API_ORIGIN = 'http://localhost:8080'
const PROFILE_URL = `${API_ORIGIN}/api/farm-admin/profile`
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const EDITABLE_FIELDS = [
    'firstName', 'surname', 'middleInitial', 'nameExtension', 'mobileNumber', 'personalEmail',
    'houseLotBlock', 'street', 'barangay', 'municipalityCity', 'province', 'region', 'zipCode', 'bio',
]

const REQUIRED_FIELDS = {
    firstName: 'First name',
    surname: 'Surname',
    barangay: 'Barangay',
    municipalityCity: 'Municipality / City',
    province: 'Province',
    region: 'Region',
}

function resolveFarmAdminMedia(url) {
    if (!url) return ''
    return /^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

async function readError(response, fallback) {
    const body = await response.json().catch(() => null)
    return body?.message || fallback
}

function toDraft(profile) {
    return Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, profile?.[field] ?? '']))
}

function validateDraft(draft) {
    for (const [field, label] of Object.entries(REQUIRED_FIELDS)) {
        if (!draft[field].trim()) return `${label} is required.`
    }
    if (!/^09\d{9}$/.test(draft.mobileNumber.trim())) return 'Mobile number must be 11 digits starting with 09.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.personalEmail.trim())) return 'Enter a valid personal email.'
    if (draft.bio.length > 500) return 'Bio must be 500 characters or fewer.'
    return ''
}

function formatAddress(profile) {
    return [profile.houseLotBlock, profile.street, profile.barangay, profile.municipalityCity, profile.province, profile.region, profile.zipCode]
        .filter(Boolean)
        .join(', ') || '-'
}

function FarmAdminProfile({ onProfileUpdated }) {
    const [session] = useState(getFarmAdminSession)
    const [profile, setProfile] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(toDraft(null))
    const [formError, setFormError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [uploadingField, setUploadingField] = useState('')
    const [notice, setNotice] = useState('')
    const pictureInputRef = useRef(null)
    const coverInputRef = useRef(null)

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                const response = await fetch(PROFILE_URL, { credentials: 'include' })
                if (!response.ok) throw new Error(await readError(response, 'Unable to load your profile.'))
                const data = await response.json()
                if (isActive) setProfile(data)
            } catch (requestError) {
                if (isActive) setLoadError(requestError.message || 'Unable to load your profile.')
            }
        }

        load()
        return () => { isActive = false }
    }, [])

    async function sendUpdate(formData) {
        const response = await fetch(PROFILE_URL, { method: 'PUT', credentials: 'include', body: formData })
        if (!response.ok) throw new Error(await readError(response, 'Unable to save your profile.'))
        const updated = await response.json()
        setProfile(updated)
        onProfileUpdated?.(updated)
        return updated
    }

    function startEditing() {
        setDraft(toDraft(profile))
        setFormError('')
        setNotice('')
        setIsEditing(true)
    }

    function updateDraft(event) {
        const { name, value } = event.target
        const nextValue = name === 'mobileNumber' ? value.replace(/\D/g, '').slice(0, 11) : value
        setDraft((current) => ({ ...current, [name]: nextValue }))
    }

    async function saveDetails(event) {
        event.preventDefault()
        const validationError = validateDraft(draft)
        if (validationError) {
            setFormError(validationError)
            return
        }

        const formData = new FormData()
        EDITABLE_FIELDS.forEach((field) => formData.append(field, draft[field].trim()))

        try {
            setIsSaving(true)
            setFormError('')
            await sendUpdate(formData)
            setIsEditing(false)
            setNotice('Profile updated.')
        } catch (requestError) {
            setFormError(requestError.message)
        } finally {
            setIsSaving(false)
        }
    }

    async function uploadImage(field, file) {
        if (!file) return
        setNotice('')
        if (!IMAGE_TYPES.includes(file.type)) {
            setLoadError('Use a JPG, PNG, or WebP image.')
            return
        }
        if (file.size > MAX_IMAGE_SIZE) {
            setLoadError('Images must be 5 MB or smaller.')
            return
        }

        const formData = new FormData()
        formData.append(field, file)

        try {
            setUploadingField(field)
            setLoadError('')
            await sendUpdate(formData)
            setNotice(field === 'profilePicture' ? 'Profile picture updated.' : 'Cover photo updated.')
        } catch (requestError) {
            setLoadError(requestError.message)
        } finally {
            setUploadingField('')
        }
    }

    function renderInput(label, name, options = {}) {
        return (
            <label className="fa-profile-field">
                <span>{label}{REQUIRED_FIELDS[name] && ' *'}</span>
                <input name={name} value={draft[name]} onChange={updateDraft} {...options} />
            </label>
        )
    }

    if (!profile) {
        return (
            <main className="farm-admin-land">
                <section className="fa-profile">
                    {loadError ? <p className="admin-alert admin-alert-error" role="alert">{loadError}</p> : <p className="fa-profile-muted">Loading profile...</p>}
                </section>
            </main>
        )
    }

    const coverUrl = resolveFarmAdminMedia(profile.coverPhotoUrl)
    const pictureUrl = resolveFarmAdminMedia(profile.profilePictureUrl)
    const initials = `${profile.firstName?.[0] ?? ''}${profile.surname?.[0] ?? ''}`.toUpperCase() || 'FA'

    return (
        <main className="farm-admin-land">
            <section className="fa-profile">
                <div className="fa-profile-card">
                    <button
                        type="button"
                        className="fa-profile-cover"
                        style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
                        onClick={() => coverInputRef.current?.click()}
                        disabled={Boolean(uploadingField)}
                        aria-label="Change cover photo"
                    >
                        <span className="fa-profile-image-hint">{uploadingField === 'coverPhoto' ? 'Uploading...' : 'Change cover photo'}</span>
                    </button>
                    <div className="fa-profile-identity">
                        <button
                            type="button"
                            className="fa-profile-avatar"
                            onClick={() => pictureInputRef.current?.click()}
                            disabled={Boolean(uploadingField)}
                            aria-label="Change profile picture"
                        >
                            {pictureUrl ? <img src={pictureUrl} alt="" /> : <span>{initials}</span>}
                            <span className="fa-profile-image-hint">{uploadingField === 'profilePicture' ? 'Uploading...' : 'Change'}</span>
                        </button>
                        <div className="fa-profile-name">
                            <p className="farm-admin-eyebrow">FARM-ADMIN</p>
                            <h1>{profile.fullName}</h1>
                            <p className="fa-profile-muted">{profile.email}</p>
                        </div>
                        {!isEditing && (
                            <button type="button" className="farm-admin-primary-button" onClick={startEditing}>Edit profile</button>
                        )}
                    </div>
                    <input ref={pictureInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { uploadImage('profilePicture', event.target.files?.[0]); event.target.value = '' }} />
                    <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { uploadImage('coverPhoto', event.target.files?.[0]); event.target.value = '' }} />
                </div>

                {loadError && <p className="admin-alert admin-alert-error" role="alert">{loadError}</p>}
                {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}

                {isEditing ? (
                    <form className="fa-profile-card fa-profile-form" onSubmit={saveDetails}>
                        <h2>Edit profile</h2>
                        <h3>Personal information</h3>
                        <div className="fa-profile-grid">
                            {renderInput('First name', 'firstName')}
                            {renderInput('Surname', 'surname')}
                            {renderInput('Middle initial', 'middleInitial', { maxLength: 5 })}
                            {renderInput('Name extension', 'nameExtension', { placeholder: 'e.g. Jr.' })}
                        </div>
                        <h3>Contact</h3>
                        <div className="fa-profile-grid">
                            {renderInput('Mobile number *', 'mobileNumber', { inputMode: 'numeric', placeholder: '09XXXXXXXXX' })}
                            {renderInput('Personal email *', 'personalEmail', { type: 'email' })}
                        </div>
                        <h3>Address</h3>
                        <div className="fa-profile-grid">
                            {renderInput('House / Lot / Block', 'houseLotBlock')}
                            {renderInput('Street', 'street')}
                            {renderInput('Barangay', 'barangay')}
                            {renderInput('Municipality / City', 'municipalityCity')}
                            {renderInput('Province', 'province')}
                            {renderInput('Region', 'region')}
                            {renderInput('ZIP code', 'zipCode')}
                        </div>
                        <h3>About</h3>
                        <label className="fa-profile-field">
                            <span>Bio ({draft.bio.length}/500)</span>
                            <textarea name="bio" rows="4" maxLength={500} value={draft.bio} onChange={updateDraft} placeholder="Tell your Farmers about yourself." />
                        </label>
                        {formError && <p className="admin-alert admin-alert-error" role="alert">{formError}</p>}
                        <div className="fa-profile-actions">
                            <button type="button" className="farm-admin-secondary-button" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
                            <button type="submit" className="farm-admin-primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</button>
                        </div>
                    </form>
                ) : (
                    <div className="fa-profile-columns">
                        <div className="fa-profile-card fa-profile-section">
                            <h2>About</h2>
                            <p className={profile.bio ? '' : 'fa-profile-muted'}>{profile.bio || 'No bio yet.'}</p>
                        </div>
                        <div className="fa-profile-card fa-profile-section">
                            <h2>Farm</h2>
                            {profile.farm ? (
                                <dl className="fa-profile-list">
                                    <dt>Farm name</dt><dd>{profile.farm.farmName || '-'}</dd>
                                    <dt>Farm code</dt><dd><span className="fa-profile-code">{profile.farm.farmCode}</span></dd>
                                </dl>
                            ) : <p className="fa-profile-muted">No farm registered yet. Use the Land section to register your farm.</p>}
                        </div>
                        <div className="fa-profile-card fa-profile-section fa-profile-wide">
                            <h2>Details</h2>
                            <dl className="fa-profile-list">
                                <dt>Mobile number</dt><dd>{profile.mobileNumber || '-'}</dd>
                                <dt>Personal email</dt><dd>{profile.personalEmail || '-'}</dd>
                                <dt>Address</dt><dd>{formatAddress(profile)}</dd>
                            </dl>
                        </div>
                    </div>
                )}

                {!isEditing && (
                    <section className="fa-profile-posts" aria-labelledby="fa-profile-posts-title">
                        <h2 id="fa-profile-posts-title">My posts</h2>
                        <FarmerDashboardMiddleNavigation
                            session={{ ...session, fullName: profile.fullName, profilePictureUrl: profile.profilePictureUrl }}
                            authorId={session.userId}
                            emptyText="You haven't posted anything yet."
                        />
                    </section>
                )}
            </section>
        </main>
    )
}

export default FarmAdminProfile
