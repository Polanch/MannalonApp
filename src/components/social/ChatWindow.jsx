import { useEffect, useRef, useState } from 'react'
import SocialAvatar from './SocialAvatar.jsx'
import GroupAvatar from './GroupAvatar.jsx'
import { getApiErrorMessage } from '../../services/farmerApi.js'
import {
    asList,
    fetchMessages,
    formatFileSize,
    isImageAttachment,
    markConversationRead,
    sendAttachmentMessage,
    sendMessage,
    socialFileUrl,
    updateGroupConversation,
} from '../../services/socialApi.js'

const POLL_MS = 4000
const MAX_MESSAGE_LENGTH = 1000

function formatTime(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const isToday = date.toDateString() === new Date().toDateString()
    return isToday
        ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Server messages are deduplicated by id; local (sending/failed) ones stay at the end.
function mergeMessages(current, incoming) {
    const local = current.filter((message) => message.clientId)
    const byId = new Map(current.filter((message) => !message.clientId).map((message) => [message.messageId, message]))
    incoming.forEach((message) => byId.set(message.messageId, message))
    const saved = [...byId.values()].sort((a, b) => Number(a.messageId) - Number(b.messageId))
    return saved.concat(local)
}

function ChatWindow({ chat, session, onClose, onToggleMinimize, onOpenProfile, onRead, onGroupUpdated }) {
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [draft, setDraft] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [unseen, setUnseen] = useState(0)
    const [isInfoOpen, setIsInfoOpen] = useState(false)
    const listRef = useRef(null)
    const photoInputRef = useRef(null)
    const imageInputRef = useRef(null)
    const fileInputRef = useRef(null)
    const lastIdRef = useRef(null)
    const hasLoadedRef = useRef(false)
    const { conversationId, user, group, minimized } = chat
    const isGroup = Boolean(group)
    const headerName = isGroup ? group.title || 'Group chat' : user?.fullName || 'Chat'
    const members = isGroup ? group.members || [] : []

    useEffect(() => {
        let isActive = true

        async function poll() {
            const initial = !hasLoadedRef.current
            try {
                const data = asList(await fetchMessages({
                    userId: session.userId,
                    conversationId,
                    afterId: initial ? undefined : lastIdRef.current ?? undefined,
                }))
                if (!isActive) return
                hasLoadedRef.current = true
                if (data.length) {
                    lastIdRef.current = data[data.length - 1].messageId
                    setMessages((current) => mergeMessages(current, data))
                    const fromOther = data.filter((message) => message.senderUserId !== session.userId).length
                    if (!initial && fromOther && minimized) setUnseen((count) => count + fromOther)
                    if (!minimized && (initial || fromOther)) {
                        markConversationRead({ userId: session.userId, conversationId }).then(onRead).catch(() => {})
                    }
                }
                setError('')
            } catch (requestError) {
                if (isActive && initial) setError(getApiErrorMessage(requestError, 'Unable to load messages.'))
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        poll()
        const intervalId = setInterval(poll, minimized ? POLL_MS * 3 : POLL_MS)
        return () => {
            isActive = false
            clearInterval(intervalId)
        }
    }, [conversationId, session.userId, minimized, onRead])

    useEffect(() => {
        if (!minimized && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [messages, minimized])

    function toggleMinimize() {
        setUnseen(0)
        onToggleMinimize(conversationId)
    }

    async function deliver(content, clientId) {
        setIsSending(true)
        setError('')
        try {
            const saved = await sendMessage({ userId: session.userId, conversationId, content })
            setMessages((current) => mergeMessages(current.filter((message) => message.clientId !== clientId), [saved]))
        } catch (requestError) {
            setMessages((current) => current.map((message) => (message.clientId === clientId ? { ...message, failed: true } : message)))
            setError(getApiErrorMessage(requestError, 'Message not sent.'))
        } finally {
            setIsSending(false)
        }
    }

    function submit(event) {
        event.preventDefault()
        const content = draft.trim()
        if (!content || isSending) return

        const clientId = `local-${Date.now()}`
        setMessages((current) => [...current, { clientId, messageId: clientId, senderUserId: session.userId, content, sentAt: new Date().toISOString() }])
        setDraft('')
        deliver(content, clientId)
    }

    function retry(message) {
        setMessages((current) => current.map((item) => (item.clientId === message.clientId ? { ...item, failed: false } : item)))
        deliver(message.content, message.clientId)
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) submit(event)
    }

    async function uploadAttachment(file) {
        if (!file) return
        setIsSending(true)
        setError('')
        try {
            const saved = await sendAttachmentMessage({
                userId: session.userId,
                conversationId,
                content: draft.trim() || undefined,
                file,
            })
            setDraft('')
            setMessages((current) => mergeMessages(current, [saved]))
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Attachment not sent.'))
        } finally {
            setIsSending(false)
        }
    }

    function pickAttachment(event) {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) uploadAttachment(file)
    }

    async function changeGroupPhoto(event) {
        const photo = event.target.files?.[0]
        event.target.value = ''
        if (!photo) return
        setError('')
        try {
            const updated = await updateGroupConversation({ userId: session.userId, conversationId, photo })
            onGroupUpdated?.(updated)
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to update the group photo.'))
        }
    }

    function renderAttachment(message) {
        if (!message.attachmentUrl) return null
        const viewUrl = socialFileUrl(message.attachmentUrl, session.userId)
        if (isImageAttachment(message)) {
            return (
                <a className="chat-attachment-image" href={viewUrl} target="_blank" rel="noreferrer">
                    <img src={viewUrl} alt={message.attachmentName || 'Shared photo'} />
                </a>
            )
        }
        return (
            <a
                className="chat-attachment-file"
                href={socialFileUrl(message.attachmentUrl, session.userId, { download: true })}
                target="_blank"
                rel="noreferrer"
            >
                <span className="chat-attachment-icon" aria-hidden="true">📎</span>
                <span className="chat-attachment-meta">
                    <strong>{message.attachmentName || 'Attachment'}</strong>
                    <small>{formatFileSize(message.attachmentSize) || 'Download'}</small>
                </span>
            </a>
        )
    }

    return (
        <section className={`chat-window${minimized ? ' is-minimized' : ''}`} aria-label={`Chat with ${headerName}`}>
            <header className="chat-window-head">
                {isGroup ? (
                    <button type="button" className="chat-window-user" onClick={() => setIsInfoOpen((open) => !open)} title="Group details">
                        <GroupAvatar group={group} viewerId={session.userId} size={30} />
                        <span>
                            <strong>{headerName}</strong>
                            <small>{members.length} member{members.length === 1 ? '' : 's'}</small>
                        </span>
                    </button>
                ) : (
                    <button type="button" className="chat-window-user" onClick={() => onOpenProfile(user.userId)} title="View profile">
                        <SocialAvatar user={user} size={30} />
                        <span>
                            <strong>{headerName}</strong>
                            {user.role && <small>{user.role === 'Farm-Admin' ? 'Farm Administrator' : user.role}</small>}
                        </span>
                    </button>
                )}
                {unseen > 0 && <span className="chat-window-unseen">{unseen}</span>}
                <button type="button" className="chat-window-icon" onClick={toggleMinimize} aria-label={minimized ? 'Expand chat' : 'Minimize chat'}>
                    {minimized ? '▴' : '–'}
                </button>
                <button type="button" className="chat-window-icon" onClick={() => onClose(conversationId)} aria-label="Close chat">×</button>
            </header>
            {!minimized && isGroup && isInfoOpen && (
                <div className="chat-group-info">
                    <button type="button" className="chat-group-photo-button" onClick={() => photoInputRef.current?.click()}>
                        Change group photo
                    </button>
                    <input
                        ref={photoInputRef}
                        className="chat-hidden-input"
                        type="file"
                        accept="image/*"
                        onChange={changeGroupPhoto}
                    />
                    <ul className="chat-group-members">
                        {members.map((member) => (
                            <li key={member.userId}>
                                <button type="button" onClick={() => onOpenProfile(member.userId)}>
                                    <SocialAvatar user={member} size={24} />
                                    <span>{member.fullName}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!minimized && (
                <>
                    <div className="chat-window-body" ref={listRef}>
                        {isLoading && <p className="chat-window-status">Loading...</p>}
                        {!isLoading && !messages.length && !error && (
                            <div className="chat-window-empty">
                                {isGroup ? <GroupAvatar group={group} viewerId={session.userId} size={56} /> : <SocialAvatar user={user} size={56} />}
                                <strong>{headerName}</strong>
                                <span>{isGroup ? 'Start the conversation with your group.' : 'Say hello to start the conversation.'}</span>
                            </div>
                        )}
                        {messages.map((message, index) => {
                            const isMine = message.senderUserId === session.userId
                            const previous = messages[index - 1]
                            const next = messages[index + 1]
                            const showAvatar = !isMine && (!next || next.senderUserId !== message.senderUserId)
                            const isGroupStart = !previous || previous.senderUserId !== message.senderUserId
                            const sender = isGroup
                                ? { userId: message.senderUserId, fullName: message.senderName, profilePictureUrl: message.senderProfilePictureUrl }
                                : user
                            const attachment = renderAttachment(message)
                            return (
                                <div key={message.clientId || message.messageId} className={`chat-message${isMine ? ' is-mine' : ''}${isGroupStart ? ' is-group-start' : ''}`}>
                                    {!isMine && (showAvatar ? <SocialAvatar user={sender} size={24} /> : <span className="chat-message-spacer" />)}
                                    <span className="chat-message-content">
                                        {isGroup && !isMine && isGroupStart && message.senderName && (
                                            <small className="chat-message-sender">{message.senderName}</small>
                                        )}
                                        {attachment}
                                        {message.content && (
                                            <p
                                                className={`chat-bubble${message.clientId && !message.failed ? ' is-pending' : ''}${message.failed ? ' is-failed' : ''}`}
                                                title={formatTime(message.sentAt)}
                                            >
                                                {message.content}
                                            </p>
                                        )}
                                    </span>
                                    {message.failed && (
                                        <button type="button" className="chat-retry" onClick={() => retry(message)}>Retry</button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {error && <p className="chat-window-error" role="alert">{error}</p>}
                    <form className="chat-window-compose" onSubmit={submit}>
                        <button
                            type="button"
                            className="chat-compose-icon"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={isSending}
                            aria-label="Send a photo"
                            title="Send a photo"
                        >
                            🖼
                        </button>
                        <button
                            type="button"
                            className="chat-compose-icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending}
                            aria-label="Send a file"
                            title="Send a file"
                        >
                            📎
                        </button>
                        <input
                            ref={imageInputRef}
                            className="chat-hidden-input"
                            type="file"
                            accept="image/*"
                            onChange={pickAttachment}
                        />
                        <input
                            ref={fileInputRef}
                            className="chat-hidden-input"
                            type="file"
                            onChange={pickAttachment}
                        />
                        <textarea
                            rows="1"
                            value={draft}
                            maxLength={MAX_MESSAGE_LENGTH}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Aa"
                            aria-label="Type a message"
                        />
                        <button type="submit" disabled={!draft.trim() || isSending} aria-label="Send">➤</button>
                    </form>
                </>
            )}
        </section>
    )
}

export default ChatWindow
