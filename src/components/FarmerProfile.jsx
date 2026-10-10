import { useEffect, useRef, useState } from 'react'
import placeholder from '../assets/images/placeholder.png'
import FarmerDashboardLeftNavigation from './farmer_components/FarmerDashboardLeftNavigation.jsx'
import FarmerDashboardMiddleNavigation from './farmer_components/FarmerDashboardMiddleNavigation.jsx'
import FarmerProfileRightNavigation from './farmer_components/FarmerProfileRightNavigation.jsx'
import { fetchProfile, getApiErrorMessage, resolveMediaUrl, updateProfile } from '../services/farmerApi.js'

const BIO_MAX_LENGTH = 500

function FarmerProfile({ session, onSessionUpdate }) {
    const [profile, setProfile] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [pending, setPending] = useState(null)
    const pictureInputRef = useRef(null)
    const coverInputRef = useRef(null)
    const [isEditingBio, setIsEditingBio] = useState(false)
    const [bioDraft, setBioDraft] = useState('')
    const [isSavingBio, setIsSavingBio] = useState(false)
    const [bioError, setBioError] = useState('')

    useEffect(() => {
        let cancelled = false
        fetchProfile({ userId: session.userId })
            .then((data) => {
                if (!cancelled) {
                    setProfile(data)
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setLoadError(getApiErrorMessage(error, 'Unable to load your profile.'))
                }
            })
        return () => {
            cancelled = true
        }
    }, [session.userId])

    function selectImage(event, field) {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) {
            return
        }

        if (pending) {
            URL.revokeObjectURL(pending.url)
        }
        setLoadError('')
        setPending({ field, file, url: URL.createObjectURL(file) })
    }

    function cancelPending() {
        if (pending) {
            URL.revokeObjectURL(pending.url)
        }
        setPending(null)
    }

    async function confirmPending() {
        if (!pending) {
            return
        }

        setIsUploading(true)
        setLoadError('')
        try {
            const updated = await updateProfile({ userId: session.userId, fields: {}, [pending.field]: pending.file })
            setProfile(updated)
            onSessionUpdate?.({ profilePictureUrl: updated.profilePictureUrl || '' })
            cancelPending()
        } catch (error) {
            setLoadError(getApiErrorMessage(error, 'Unable to upload the image.'))
        } finally {
            setIsUploading(false)
        }
    }

    function startEditingBio() {
        setBioDraft(profile?.bio ?? '')
        setBioError('')
        setIsEditingBio(true)
    }

    async function saveBio(event) {
        event.preventDefault()
        setIsSavingBio(true)
        setBioError('')
        try {
            const updated = await updateProfile({ userId: session.userId, fields: { bio: bioDraft.trim() } })
            setProfile(updated)
            setIsEditingBio(false)
        } catch (error) {
            setBioError(getApiErrorMessage(error, 'Unable to save your bio.'))
        } finally {
            setIsSavingBio(false)
        }
    }

    const pictureUrl = resolveMediaUrl(profile?.profilePictureUrl) || placeholder
    const coverUrl = resolveMediaUrl(profile?.coverPhotoUrl)
    const displayName = profile?.fullName || session.fullName

    const profileHeader = (
        <div className="farmer-profile">
            <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => selectImage(event, 'coverPhoto')}
                hidden
            />
            <input
                ref={pictureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => selectImage(event, 'profilePicture')}
                hidden
            />
            <button
                type="button"
                className="farmer-profile-cover"
                style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Change cover photo"
            >
                <span className="farmer-profile-image-hint">{isUploading ? 'Uploading...' : 'Change cover photo'}</span>
            </button>
            <div className="farmer-profile-info">
                <button
                    type="button"
                    className="farmer-profile-pfp-button"
                    onClick={() => pictureInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Change profile picture"
                >
                    <img src={pictureUrl} className="farmer-profile-pfp" alt="Profile" />
                    <span className="farmer-profile-image-hint">Change</span>
                </button>
                <div className="farmer-profile-text">
                    <h2>{displayName}</h2>
                    <p>{session.userId}</p>
                </div>
            </div>
            <div className="farmer-profile-bio-section">
                <h3>Bio</h3>
                {!isEditingBio ? (
                    <>
                        <p className="farmer-profile-bio">{profile?.bio || 'No bio yet.'}</p>
                        <button type="button" className="farmer-profile-edit" onClick={startEditingBio} disabled={!profile}>
                            Edit bio
                        </button>
                    </>
                ) : (
                    <form onSubmit={saveBio} className="farmer-profile-bio-form">
                        <textarea
                            value={bioDraft}
                            maxLength={BIO_MAX_LENGTH}
                            rows={3}
                            onChange={(event) => setBioDraft(event.target.value)}
                            placeholder="Tell others about yourself..."
                        ></textarea>
                        <small>{bioDraft.length}/{BIO_MAX_LENGTH}</small>
                        {bioError && <p className="post-error" role="alert">{bioError}</p>}
                        <div className="farmer-profile-actions">
                            <button type="submit" disabled={isSavingBio}>{isSavingBio ? 'Saving...' : 'Save'}</button>
                            <button type="button" onClick={() => setIsEditingBio(false)} disabled={isSavingBio}>Cancel</button>
                        </div>
                    </form>
                )}
            </div>
            {loadError && <p className="post-error" role="alert">{loadError}</p>}
            {pending && (
                <div className="farmer-confirm-overlay" role="dialog" aria-modal="true">
                    <div className="farmer-confirm-dialog">
                        <h3>{pending.field === 'coverPhoto' ? 'Save new cover photo?' : 'Save new profile picture?'}</h3>
                        <img
                            src={pending.url}
                            alt="Preview"
                            className={pending.field === 'coverPhoto' ? 'farmer-confirm-cover' : 'farmer-confirm-pfp'}
                        />
                        {loadError && <p className="post-error" role="alert">{loadError}</p>}
                        <div className="farmer-profile-actions">
                            <button type="button" onClick={confirmPending} disabled={isUploading}>
                                {isUploading ? 'Saving...' : 'Save'}
                            </button>
                            <button type="button" onClick={cancelPending} disabled={isUploading}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <div className="farmer-dashboard farmer-profile-layout">
            <FarmerDashboardLeftNavigation/>
            <FarmerDashboardMiddleNavigation
                session={{ ...session, profilePictureUrl: profile?.profilePictureUrl ?? session.profilePictureUrl }}
                authorId={session.userId}
                header={profileHeader}
            />
            <FarmerProfileRightNavigation profile={profile} />
        </div>
    )
}

export default FarmerProfile

