import { useEffect, useRef, useState } from 'react'
import SocialAvatar from './SocialAvatar.jsx'
import GroupAvatar from './GroupAvatar.jsx'
import friendsIcon from '../../assets/images/m-icon1.png'
import chatIcon from '../../assets/images/m-icon2.png'
import bellIcon from '../../assets/images/m-icon3.png'
import menuIcon from '../../assets/images/m-icon4.png'
import { formatRelativeTime, getApiErrorMessage } from '../../services/farmerApi.js'
import { useSocial } from '../../services/socialContext.js'
import {
    acceptFriendRequest,
    asList,
    conversationTitle,
    declineFriendRequest,
    fetchConversations,
    fetchFriendRequests,
    fetchFriends,
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    notificationText,
    searchUsers,
    sendFriendRequest,
} from '../../services/socialApi.js'

function roleLabel(user) {
    if (user?.role === 'Farm-Admin') return 'Farm Administrator'
    return user?.farmName || user?.role || ''
}

function useLoader(loader) {
    const [state, setState] = useState({ items: [], isLoading: true, error: '' })
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let isActive = true
        async function load() {
            try {
                const items = asList(await loader())
                if (isActive) setState({ items, isLoading: false, error: '' })
            } catch (requestError) {
                if (isActive) setState({ items: [], isLoading: false, error: getApiErrorMessage(requestError, 'Unable to load.') })
            }
        }
        load()
        return () => { isActive = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadKey])

    return [state, setState, () => setReloadKey((key) => key + 1)]
}

function PanelStatus({ state, empty }) {
    if (state.isLoading) return <p className="social-panel-status">Loading...</p>
    if (state.error) return <p className="social-panel-status is-error">{state.error}</p>
    if (!state.items.length) return <p className="social-panel-status">{empty}</p>
    return null
}

function FriendRequestRow({ request, onDone }) {
    const { session, openProfile, refreshSummary } = useSocial()
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const from = request.from || {}

    async function respond(action) {
        setBusy(action)
        setError('')
        try {
            const call = action === 'accept' ? acceptFriendRequest : declineFriendRequest
            await call({ userId: session.userId, requestId: request.requestId })
            onDone(request.requestId, action)
            refreshSummary()
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Please try again.'))
            setBusy('')
        }
    }

    return (
        <li className="social-row">
            <button type="button" className="social-row-main" onClick={() => openProfile(from.userId)}>
                <SocialAvatar user={from} size={44} />
                <span>
                    <strong>{from.fullName}</strong>
                    <small>{roleLabel(from)}{request.createdAt ? ` · ${formatRelativeTime(request.createdAt)}` : ''}</small>
                </span>
            </button>
            <div className="social-row-actions">
                <button type="button" className="social-btn social-btn-primary" disabled={Boolean(busy)} onClick={() => respond('accept')}>
                    {busy === 'accept' ? '...' : 'Confirm'}
                </button>
                <button type="button" className="social-btn" disabled={Boolean(busy)} onClick={() => respond('decline')}>
                    {busy === 'decline' ? '...' : 'Delete'}
                </button>
            </div>
            {error && <p className="social-row-error">{error}</p>}
        </li>
    )
}

function FindPeople() {
    const { session, openProfile } = useSocial()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState({ items: [], isLoading: false, error: '' })
    const [sent, setSent] = useState({})

    useEffect(() => {
        const text = query.trim()
        if (text.length < 2) return undefined
        let isActive = true
        const timeoutId = setTimeout(async () => {
            setResults((current) => ({ ...current, isLoading: true, error: '' }))
            try {
                const items = asList(await searchUsers({ userId: session.userId, query: text }))
                if (isActive) setResults({ items, isLoading: false, error: '' })
            } catch (requestError) {
                if (isActive) setResults({ items: [], isLoading: false, error: getApiErrorMessage(requestError, 'Search failed.') })
            }
        }, 350)
        return () => {
            isActive = false
            clearTimeout(timeoutId)
        }
    }, [query, session.userId])

    async function addFriend(user) {
        setSent((current) => ({ ...current, [user.userId]: 'sending' }))
        try {
            const result = await sendFriendRequest({ userId: session.userId, targetUserId: user.userId })
            setSent((current) => ({ ...current, [user.userId]: result?.status === 'ACCEPTED' ? 'FRIENDS' : 'REQUEST_SENT' }))
        } catch (requestError) {
            setSent((current) => ({ ...current, [user.userId]: getApiErrorMessage(requestError, 'Failed') }))
        }
    }

    const showResults = query.trim().length >= 2

    return (
        <div className="social-find">
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search farmers and farm admins" autoFocus />
            {showResults && results.isLoading && <p className="social-panel-status">Searching...</p>}
            {showResults && results.error && <p className="social-panel-status is-error">{results.error}</p>}
            {showResults && !results.isLoading && !results.error && !results.items.length && <p className="social-panel-status">No one found.</p>}
            {!showResults && <p className="social-panel-status">Type at least 2 letters of a name.</p>}
            {showResults && (
                <ul className="social-list">
                    {results.items.map((user) => {
                        const status = sent[user.userId] || user.friendStatus
                        return (
                            <li key={user.userId} className="social-row">
                                <button type="button" className="social-row-main" onClick={() => openProfile(user.userId)}>
                                    <SocialAvatar user={user} size={40} />
                                    <span>
                                        <strong>{user.fullName}</strong>
                                        <small>{roleLabel(user)}</small>
                                    </span>
                                </button>
                                <div className="social-row-actions">
                                    {status === 'FRIENDS' ? <span className="social-chip">Friends</span>
                                        : status === 'REQUEST_SENT' ? <span className="social-chip">Requested</span>
                                            : status === 'REQUEST_RECEIVED' ? <button type="button" className="social-btn" onClick={() => openProfile(user.userId)}>Respond</button>
                                                : status === 'sending' ? <span className="social-chip">...</span>
                                                    : status && status !== 'NONE' && status !== 'SELF' ? <span className="social-chip is-error">{status}</span>
                                                        : status === 'SELF' ? null
                                                            : <button type="button" className="social-btn social-btn-primary" onClick={() => addFriend(user)}>Add friend</button>}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

function FriendsPanel({ onClose }) {
    const { session, summary, openChat, openProfile } = useSocial()
    const [tab, setTab] = useState(summary.pendingFriendRequests > 0 ? 'requests' : 'friends')
    const [requests, setRequests] = useLoader(() => fetchFriendRequests({ userId: session.userId }))
    const [friends, , reloadFriends] = useLoader(() => fetchFriends({ userId: session.userId }))

    function handleRequestDone(requestId, action) {
        setRequests((current) => ({ ...current, items: current.items.filter((item) => item.requestId !== requestId) }))
        if (action === 'accept') reloadFriends()
    }

    return (
        <div className="social-panel" role="dialog" aria-label="Friends">
            <header className="social-panel-head">
                <h3>Friends</h3>
            </header>
            <div className="social-tabs" role="tablist">
                {[
                    ['requests', `Requests${requests.items.length ? ` (${requests.items.length})` : ''}`],
                    ['friends', 'All friends'],
                    ['find', 'Find people'],
                ].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>
                ))}
            </div>
            <div className="social-panel-body">
                {tab === 'requests' && (
                    <>
                        <PanelStatus state={requests} empty="No pending friend requests." />
                        <ul className="social-list">
                            {requests.items.map((request) => <FriendRequestRow key={request.requestId} request={request} onDone={handleRequestDone} />)}
                        </ul>
                    </>
                )}
                {tab === 'friends' && (
                    <>
                        <PanelStatus state={friends} empty="No friends yet. Use Find people to add some." />
                        <ul className="social-list">
                            {friends.items.map((friend) => (
                                <li key={friend.userId} className="social-row">
                                    <button type="button" className="social-row-main" onClick={() => { openProfile(friend.userId); onClose() }}>
                                        <SocialAvatar user={friend} size={40} />
                                        <span>
                                            <strong>{friend.fullName}</strong>
                                            <small>{roleLabel(friend)}</small>
                                        </span>
                                    </button>
                                    <div className="social-row-actions">
                                        <button type="button" className="social-btn" onClick={() => { openChat(friend); onClose() }}>Message</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                {tab === 'find' && <FindPeople />}
            </div>
        </div>
    )
}

function ChatsPanel({ onClose }) {
    const { session, openChat, openGroupChat } = useSocial()
    const [conversations] = useLoader(() => fetchConversations({ userId: session.userId }))
    const [filter, setFilter] = useState('')
    const visible = conversations.items.filter((conversation) => !filter.trim()
        || conversationTitle(conversation).toLowerCase().includes(filter.trim().toLowerCase()))

    return (
        <div className="social-panel" role="dialog" aria-label="Chats">
            <header className="social-panel-head">
                <h3>Chats</h3>
            </header>
            <div className="social-find">
                <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search chats" />
            </div>
            <div className="social-panel-body">
                <PanelStatus state={conversations} empty="No chats yet. Open someone's profile and tap Message." />
                <ul className="social-list">
                    {visible.map((conversation) => {
                        const last = conversation.lastMessage
                        const isUnread = conversation.unreadCount > 0
                        const isGroup = conversation.type === 'GROUP'
                        const lastPreview = last ? (last.content || last.attachmentName || 'Sent an attachment') : 'No messages yet'
                        return (
                            <li key={conversation.conversationId}>
                                <button
                                    type="button"
                                    className={`social-row social-row-button${isUnread ? ' is-unread' : ''}`}
                                    onClick={() => {
                                        if (isGroup) openGroupChat(conversation)
                                        else openChat(conversation.otherUser, conversation.conversationId)
                                        onClose()
                                    }}
                                >
                                    {isGroup
                                        ? <GroupAvatar group={conversation} viewerId={session.userId} size={48} />
                                        : <SocialAvatar user={conversation.otherUser} size={48} />}
                                    <span className="social-row-text">
                                        <strong>{conversationTitle(conversation)}</strong>
                                        <small>
                                            {last ? `${last.senderUserId === session.userId ? 'You: ' : ''}${lastPreview}` : lastPreview}
                                            {last?.sentAt ? ` · ${formatRelativeTime(last.sentAt)}` : ''}
                                        </small>
                                    </span>
                                    {isUnread && <span className="social-dot" aria-label={`${conversation.unreadCount} unread`} />}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

function NotificationsPanel({ onClose }) {
    const { session, openProfile, openOwnProfile, refreshSummary } = useSocial()
    const [notifications, setNotifications] = useLoader(() => fetchNotifications({ userId: session.userId }))
    const hasUnread = notifications.items.some((item) => !item.read)

    async function markAll() {
        setNotifications((current) => ({ ...current, items: current.items.map((item) => ({ ...item, read: true })) }))
        try {
            await markAllNotificationsRead({ userId: session.userId })
        } finally {
            refreshSummary()
        }
    }

    async function openNotification(notification) {
        if (!notification.read) {
            setNotifications((current) => ({
                ...current,
                items: current.items.map((item) => (item.notificationId === notification.notificationId ? { ...item, read: true } : item)),
            }))
            markNotificationRead({ userId: session.userId, notificationId: notification.notificationId }).then(refreshSummary).catch(() => {})
        }
        if (String(notification.type).startsWith('FRIEND_')) openProfile(notification.actor?.userId)
        else openOwnProfile()
        onClose()
    }

    return (
        <div className="social-panel" role="dialog" aria-label="Notifications">
            <header className="social-panel-head">
                <h3>Notifications</h3>
                {hasUnread && <button type="button" className="social-link" onClick={markAll}>Mark all as read</button>}
            </header>
            <div className="social-panel-body">
                <PanelStatus state={notifications} empty="You're all caught up." />
                <ul className="social-list">
                    {notifications.items.map((notification) => (
                        <li key={notification.notificationId}>
                            <button
                                type="button"
                                className={`social-row social-row-button${notification.read ? '' : ' is-unread'}`}
                                onClick={() => openNotification(notification)}
                            >
                                <SocialAvatar user={notification.actor} size={48} />
                                <span className="social-row-text">
                                    <span className="social-notif-text">{notificationText(notification)}</span>
                                    <small className={notification.read ? '' : 'is-accent'}>{formatRelativeTime(notification.createdAt)}</small>
                                </span>
                                {!notification.read && <span className="social-dot" />}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

function AccountMenu({ onClose }) {
    const { session, openOwnProfile, openSettings, logout } = useSocial()

    return (
        <div className="social-panel social-account" role="menu" aria-label="Account">
            <button type="button" className="social-account-profile" role="menuitem" onClick={() => { openOwnProfile(); onClose() }}>
                <SocialAvatar user={session} size={44} />
                <span>
                    <strong>{session.fullName}</strong>
                    <small>See your profile</small>
                </span>
            </button>
            <hr />
            <button type="button" className="social-account-item" role="menuitem" onClick={() => { openOwnProfile(); onClose() }}>
                <span className="social-account-icon">👤</span> Profile
            </button>
            <button type="button" className="social-account-item" role="menuitem" onClick={() => { openSettings(); onClose() }}>
                <span className="social-account-icon">⚙</span> Settings
            </button>
            <button type="button" className="social-account-item" role="menuitem" onClick={() => { onClose(); logout() }}>
                <span className="social-account-icon">⎋</span> Log out
            </button>
        </div>
    )
}

const BUTTONS = [
    { key: 'friends', icon: friendsIcon, label: 'Friends', countKey: 'pendingFriendRequests', iconClass: 'menu-icon1', Panel: FriendsPanel },
    { key: 'chats', icon: chatIcon, label: 'Chats', countKey: 'unreadMessages', iconClass: 'menu-icon2', Panel: ChatsPanel },
    { key: 'notifications', icon: bellIcon, label: 'Notifications', countKey: 'unreadNotifications', iconClass: 'menu-icon3', Panel: NotificationsPanel },
    { key: 'account', icon: menuIcon, label: 'Account', iconClass: 'menu-icon4', Panel: AccountMenu },
]

function SocialHeaderActions({ className = '' }) {
    const { summary } = useSocial()
    const [openKey, setOpenKey] = useState(null)
    const rootRef = useRef(null)

    useEffect(() => {
        if (!openKey) return undefined
        function handlePointer(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) setOpenKey(null)
        }
        function handleKey(event) {
            if (event.key === 'Escape') setOpenKey(null)
        }
        document.addEventListener('mousedown', handlePointer)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handlePointer)
            document.removeEventListener('keydown', handleKey)
        }
    }, [openKey])

    return (
        <div className={`social-actions ${className}`.trim()} ref={rootRef}>
            {BUTTONS.map(({ key, icon, label, countKey, iconClass, Panel }) => {
                const count = countKey ? Number(summary[countKey]) || 0 : 0
                const isOpen = openKey === key
                return (
                    <div key={key} className="social-action">
                        <button
                            type="button"
                            className={`social-action-button${count > 0 ? ' has-activity' : ''}${isOpen ? ' is-open' : ''}`}
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            aria-label={count ? `${label} (${count} new)` : label}
                            aria-expanded={isOpen}
                            title={label}
                        >
                            <img src={icon} alt="" className={iconClass} />
                            {count > 0 && <span className="social-badge">{count > 99 ? '99+' : count}</span>}
                        </button>
                        {isOpen && <Panel onClose={() => setOpenKey(null)} />}
                    </div>
                )
            })}
        </div>
    )
}

export default SocialHeaderActions
