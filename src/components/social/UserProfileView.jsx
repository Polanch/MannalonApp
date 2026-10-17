import { useEffect, useRef, useState } from 'react'
import placeholder from '../../assets/images/placeholder.png'
import FarmerDashboardMiddleNavigation from '../farmer_components/FarmerDashboardMiddleNavigation.jsx'
import { getApiErrorMessage, resolveMediaUrl } from '../../services/farmerApi.js'
import { useSocial } from '../../services/socialContext.js'
import {
    acceptFriendRequest,
    cancelFriendRequest,
    declineFriendRequest,
    fetchUserProfile,
    removeFriend,
    sendFriendRequest,
} from '../../services/socialApi.js'

function roleText(profile) {
    return profile?.role === 'Farm-Admin' ? 'Farm Administrator' : (profile?.role || 'Farmer')
}

function FriendButton({ profile, onChange }) {
    const { session, refreshSummary } = useSocial()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        if (!isMenuOpen) return undefined
        function handlePointer(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false)
        }
        document.addEventListener('mousedown', handlePointer)
        return () => document.removeEventListener('mousedown', handlePointer)
    }, [isMenuOpen])

    async function run(action, nextStatus) {
        setBusy(true)
        setError('')
        setIsMenuOpen(false)
        try {
            const result = await action()
            const status = typeof nextStatus === 'function' ? nextStatus(result) : nextStatus
            onChange({
                friendStatus: status,
                friendRequestId: status === 'REQUEST_SENT' ? (result?.requestId ?? profile.friendRequestId) : null,
                friendCount: Math.max(0, (Number(profile.friendCount) || 0)
                    + (status === 'FRIENDS' && profile.friendStatus !== 'FRIENDS' ? 1 : 0)
                    - (status !== 'FRIENDS' && profile.friendStatus === 'FRIENDS' ? 1 : 0)),
            })
            refreshSummary()
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Please try again.'))
        } finally {
            setBusy(false)
        }
    }

    const base = { userId: session.userId }
    const status = profile.friendStatus || 'NONE'

    return (
        <div className="user-profile-friend" ref={menuRef}>
            {status === 'NONE' && (
                <button type="button" className="social-btn social-btn-primary" disabled={busy}
                    onClick={() => run(() => sendFriendRequest({ ...base, targetUserId: profile.userId }),
                        (result) => (result?.status === 'ACCEPTED' ? 'FRIENDS' : 'REQUEST_SENT'))}>
                    {busy ? 'Sending...' : '+ Add friend'}
                </button>
            )}
            {status === 'REQUEST_SENT' && (
                <button type="button" className="social-btn" disabled={busy} title="Click to cancel the request"
                    onClick={() => run(() => cancelFriendRequest({ ...base, requestId: profile.friendRequestId }), 'NONE')}>
                    {busy ? 'Cancelling...' : 'Request sent · Cancel'}
                </button>
            )}
            {status === 'REQUEST_RECEIVED' && (
                <>
                    <button type="button" className="social-btn social-btn-primary" disabled={busy}
                        onClick={() => run(() => acceptFriendRequest({ ...base, requestId: profile.friendRequestId }), 'FRIENDS')}>
                        Confirm request
                    </button>
                    <button type="button" className="social-btn" disabled={busy}
                        onClick={() => run(() => declineFriendRequest({ ...base, requestId: profile.friendRequestId }), 'NONE')}>
                        Delete
                    </button>
                </>
            )}
            {status === 'FRIENDS' && (
                <>
                    <button type="button" className="social-btn" disabled={busy} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}>
                        ✓ Friends ▾
                    </button>
                    {isMenuOpen && (
                        <div className="user-profile-friend-menu" role="menu">
                            <button type="button" role="menuitem"
                                onClick={() => {
                                    if (window.confirm(`Remove ${profile.fullName} from your friends?`)) {
                                        run(() => removeFriend({ ...base, friendUserId: profile.userId }), 'NONE')
                                    } else {
                                        setIsMenuOpen(false)
                                    }
                                }}>
                                Unfriend
                            </button>
                        </div>
                    )}
                </>
            )}
            {error && <p className="social-row-error">{error}</p>}
        </div>
    )
}

function UserProfileView({ targetUserId, leftNavigation = <div /> }) {
    const { session, openChat, openOwnProfile } = useSocial()
    const [state, setState] = useState({ profile: null, isLoading: true, error: '', key: '' })
    const [reloadKey, setReloadKey] = useState(0)
    const requestKey = `${targetUserId}|${reloadKey}`
    const isSelf = targetUserId === session?.userId

    useEffect(() => {
        if (isSelf) return undefined
        let isActive = true
        async function load() {
            try {
                const profile = await fetchUserProfile({ userId: session.userId, targetUserId })
                if (isActive) setState({ profile, isLoading: false, error: '', key: requestKey })
            } catch (requestError) {
                if (isActive) setState({ profile: null, isLoading: false, error: getApiErrorMessage(requestError, 'Unable to load this profile.'), key: requestKey })
            }
        }
        load()
        return () => { isActive = false }
    }, [isSelf, requestKey, session.userId, targetUserId])

    useEffect(() => {
        if (isSelf) openOwnProfile()
    }, [isSelf, openOwnProfile])

    const isLoading = state.key !== requestKey
    const profile = isLoading ? null : state.profile

    function updateProfile(changes) {
        setState((current) => ({ ...current, profile: { ...current.profile, ...changes } }))
    }

    const coverUrl = resolveMediaUrl(profile?.coverPhotoUrl)
    const location = [profile?.barangay, profile?.municipalityCity].filter(Boolean).join(', ')

    const header = (
        <div className="farmer-profile user-profile">
            <div className="farmer-profile-cover user-profile-cover" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined} />
            <div className="farmer-profile-info user-profile-info">
                <img src={resolveMediaUrl(profile?.profilePictureUrl) || placeholder} className="farmer-profile-pfp user-profile-pfp" alt="" />
                <div className="farmer-profile-text">
                    <h2>{profile?.fullName || (isLoading ? 'Loading...' : 'Unknown user')}</h2>
                    {profile && (
                        <p className="user-profile-meta">
                            <span className={`user-profile-role${profile.role === 'Farm-Admin' ? ' is-admin' : ''}`}>{roleText(profile)}</span>
                            {profile.friendCount != null && <span>{profile.friendCount} {Number(profile.friendCount) === 1 ? 'friend' : 'friends'}</span>}
                        </p>
                    )}
                </div>
                {profile && (
                    <div className="user-profile-actions">
                        <FriendButton profile={profile} onChange={updateProfile} />
                        <button type="button" className="social-btn social-btn-primary" onClick={() => openChat(profile)}>
                            💬 Message
                        </button>
                    </div>
                )}
            </div>
            {state.error && !isLoading && (
                <p className="post-error" role="alert">
                    {state.error}{' '}
                    <button type="button" className="social-link" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
                </p>
            )}
        </div>
    )

    if (isSelf) return null

    return (
        <div className="farmer-dashboard farmer-profile-layout">
            {leftNavigation}
            <FarmerDashboardMiddleNavigation
                key={targetUserId}
                session={session}
                authorId={targetUserId}
                header={header}
                hideComposer
                emptyText={profile ? `${profile.fullName} hasn't posted anything yet.` : 'No posts yet.'}
            />
            <aside className="user-profile-about">
                <section>
                    <h3>About</h3>
                    {!profile ? <p className="social-panel-status">{isLoading ? 'Loading...' : 'Not available.'}</p> : (
                        <ul>
                            <li><span>Role</span><strong>{roleText(profile)}</strong></li>
                            {profile.role !== 'Farm-Admin' && profile.farmName && <li><span>Farm</span><strong>{profile.farmName}</strong></li>}
                            {location && <li><span>Lives in</span><strong>{location}</strong></li>}
                            {profile.postCount != null && <li><span>Posts</span><strong>{profile.postCount}</strong></li>}
                        </ul>
                    )}
                </section>
                {profile && (
                    <section>
                        <h3>Bio</h3>
                        <p className="user-profile-bio">{profile.bio || 'No bio yet.'}</p>
                    </section>
                )}
            </aside>
        </div>
    )
}

export default UserProfileView
