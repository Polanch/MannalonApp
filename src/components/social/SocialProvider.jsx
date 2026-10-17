import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../../assets/styles/social.css'
import ChatWindow from './ChatWindow.jsx'
import { getApiErrorMessage } from '../../services/farmerApi.js'
import { MAX_OPEN_CHATS, SocialContext } from '../../services/socialContext.js'
import {
    asList,
    fetchConversations,
    fetchSocialSummary,
    loadSocialPrefs,
    openConversation,
    playMessageTone,
    saveSocialPrefs,
} from '../../services/socialApi.js'

const SUMMARY_POLL_MS = 15000
const EMPTY_SUMMARY = { unreadMessages: 0, unreadNotifications: 0, pendingFriendRequests: 0 }

function SocialSettingsModal({ prefs, onChange, onClose, onEditProfile }) {
    return (
        <div className="social-modal-backdrop" role="presentation" onClick={onClose}>
            <section className="social-modal" role="dialog" aria-modal="true" aria-labelledby="social-settings-title" onClick={(event) => event.stopPropagation()}>
                <header>
                    <h3 id="social-settings-title">Settings</h3>
                    <button type="button" className="social-modal-close" onClick={onClose} aria-label="Close settings">×</button>
                </header>
                <h4>Chats</h4>
                <label className="social-toggle">
                    <span>
                        <strong>Message sound</strong>
                        <small>Play a short sound when a new message arrives.</small>
                    </span>
                    <input type="checkbox" checked={prefs.messageSound} onChange={(event) => onChange({ ...prefs, messageSound: event.target.checked })} />
                </label>
                <label className="social-toggle">
                    <span>
                        <strong>Open chats automatically</strong>
                        <small>Pop up a chat window when someone messages you.</small>
                    </span>
                    <input type="checkbox" checked={prefs.autoOpenChats} onChange={(event) => onChange({ ...prefs, autoOpenChats: event.target.checked })} />
                </label>
                <h4>Account</h4>
                <button type="button" className="social-settings-link" onClick={onEditProfile}>Edit my profile, photo, and contact details →</button>
            </section>
        </div>
    )
}

function SocialProvider({ session, onOpenProfile, onOpenOwnProfile, onLogout, children }) {
    const [summary, setSummary] = useState(EMPTY_SUMMARY)
    const [chats, setChats] = useState([])
    const [prefs, setPrefs] = useState(loadSocialPrefs)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [chatError, setChatError] = useState('')
    const [groupsVersion, setGroupsVersion] = useState(0)
    const lastUnreadRef = useRef(null)
    const chatsRef = useRef(chats)
    const prefsRef = useRef(prefs)
    const userId = session?.userId

    useEffect(() => {
        chatsRef.current = chats
        prefsRef.current = prefs
    }, [chats, prefs])

    const addChat = useCallback((user, conversationId, { minimized = false, group = null } = {}) => {
        setChats((current) => {
            const existing = current.find((chat) => chat.conversationId === conversationId)
            if (existing) {
                const merged = {
                    ...existing,
                    user: user ? { ...existing.user, ...user } : existing.user,
                    group: group ? { ...existing.group, ...group } : existing.group,
                    minimized,
                }
                return [merged, ...current.filter((chat) => chat !== existing)]
            }
            return [{ conversationId, user, group, minimized }, ...current].slice(0, MAX_OPEN_CHATS)
        })
    }, [])

    const openConversationRow = useCallback((conversation) => {
        if (!conversation?.conversationId) return
        if (conversation.type === 'GROUP') addChat(null, conversation.conversationId, { group: conversation })
        else addChat(conversation.otherUser, conversation.conversationId)
    }, [addChat])

    const refreshSummary = useCallback(async () => {
        if (!userId) return
        try {
            const data = { ...EMPTY_SUMMARY, ...(await fetchSocialSummary({ userId })) }
            setSummary(data)

            const previous = lastUnreadRef.current
            lastUnreadRef.current = data.unreadMessages
            if (previous === null || data.unreadMessages <= previous) return

            if (prefsRef.current.messageSound) playMessageTone()
            if (prefsRef.current.autoOpenChats) {
                const conversations = asList(await fetchConversations({ userId }))
                conversations
                    .filter((conversation) => conversation.unreadCount > 0)
                    .filter((conversation) => !chatsRef.current.some((chat) => chat.conversationId === conversation.conversationId))
                    .slice(0, MAX_OPEN_CHATS)
                    .reverse()
                    .forEach(openConversationRow)
            }
        } catch {
            // Badges are best-effort; keep the last known counts.
        }
    }, [userId, openConversationRow])

    useEffect(() => {
        if (!userId) return undefined
        const firstId = setTimeout(refreshSummary, 0)
        const intervalId = setInterval(refreshSummary, SUMMARY_POLL_MS)
        return () => {
            clearTimeout(firstId)
            clearInterval(intervalId)
        }
    }, [userId, refreshSummary])

    const openChat = useCallback(async (user, conversationId) => {
        if (!userId || !user?.userId || user.userId === userId) return
        setChatError('')
        if (conversationId) {
            addChat(user, conversationId)
            return
        }
        const existing = chatsRef.current.find((chat) => chat.user.userId === user.userId)
        if (existing) {
            addChat(user, existing.conversationId)
            return
        }
        try {
            const conversation = await openConversation({ userId, targetUserId: user.userId })
            addChat({ ...user, ...conversation.otherUser }, conversation.conversationId)
        } catch (requestError) {
            setChatError(getApiErrorMessage(requestError, 'Unable to open this chat.'))
        }
    }, [userId, addChat])

    const closeChat = useCallback((conversationId) => {
        setChats((current) => current.filter((chat) => chat.conversationId !== conversationId))
    }, [])

    const openGroupChat = useCallback((conversation) => {
        openConversationRow(conversation)
    }, [openConversationRow])

    const refreshGroups = useCallback(() => {
        setGroupsVersion((version) => version + 1)
    }, [])

    const applyGroupUpdate = useCallback((conversation) => {
        if (!conversation?.conversationId) return
        setChats((current) => current.map((chat) => (
            chat.conversationId === conversation.conversationId ? { ...chat, group: conversation } : chat
        )))
        refreshGroups()
    }, [refreshGroups])

    const toggleMinimize = useCallback((conversationId) => {
        setChats((current) => current.map((chat) => (chat.conversationId === conversationId ? { ...chat, minimized: !chat.minimized } : chat)))
    }, [])

    const openProfile = useCallback((targetUserId) => {
        if (!targetUserId) return
        if (targetUserId === userId) onOpenOwnProfile?.()
        else onOpenProfile?.(targetUserId)
    }, [userId, onOpenProfile, onOpenOwnProfile])

    const updatePrefs = useCallback((next) => {
        saveSocialPrefs(next)
        setPrefs(next)
    }, [])

    const value = useMemo(() => ({
        session,
        summary,
        refreshSummary,
        openChat,
        openGroupChat,
        groupsVersion,
        refreshGroups,
        openProfile,
        openOwnProfile: () => onOpenOwnProfile?.(),
        openSettings: () => setIsSettingsOpen(true),
        logout: () => onLogout?.(),
    }), [session, summary, refreshSummary, openChat, openGroupChat, groupsVersion, refreshGroups, openProfile, onOpenOwnProfile, onLogout])

    return (
        <SocialContext.Provider value={value}>
            {children}
            {userId && (chats.length > 0 || chatError) && (
                <div className="chat-dock">
                    {chatError && (
                        <p className="chat-dock-error" role="alert">
                            {chatError}
                            <button type="button" onClick={() => setChatError('')} aria-label="Dismiss">×</button>
                        </p>
                    )}
                    {chats.map((chat) => (
                        <ChatWindow
                            key={chat.conversationId}
                            chat={chat}
                            session={session}
                            onClose={closeChat}
                            onToggleMinimize={toggleMinimize}
                            onOpenProfile={openProfile}
                            onRead={refreshSummary}
                            onGroupUpdated={applyGroupUpdate}
                        />
                    ))}
                </div>
            )}
            {isSettingsOpen && (
                <SocialSettingsModal
                    prefs={prefs}
                    onChange={updatePrefs}
                    onClose={() => setIsSettingsOpen(false)}
                    onEditProfile={() => {
                        setIsSettingsOpen(false)
                        onOpenOwnProfile?.()
                    }}
                />
            )}
        </SocialContext.Provider>
    )
}

export default SocialProvider
