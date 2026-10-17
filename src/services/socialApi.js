import axios from 'axios'
import { API_ORIGIN } from './farmerApi.js'

const SOCIAL_API = `${API_ORIGIN}/api/social`

async function get(path, params) {
    const response = await axios.get(`${SOCIAL_API}${path}`, { params, withCredentials: true })
    return response.data
}

async function send(method, path, params, data) {
    const response = await axios.request({ method, url: `${SOCIAL_API}${path}`, params, data, withCredentials: true })
    return response.data
}

export function fetchSocialSummary({ userId }) {
    return get('/summary', { userId })
}

export function fetchUserProfile({ userId, targetUserId }) {
    return get(`/users/${encodeURIComponent(targetUserId)}`, { userId })
}

export function searchUsers({ userId, query }) {
    return get('/users/search', { userId, q: query })
}

export function fetchFriends({ userId }) {
    return get('/friends', { userId })
}

export function fetchFriendRequests({ userId }) {
    return get('/friends/requests', { userId })
}

export function sendFriendRequest({ userId, targetUserId }) {
    return send('post', '/friends/requests', { userId }, { targetUserId })
}

export function acceptFriendRequest({ userId, requestId }) {
    return send('put', `/friends/requests/${requestId}/accept`, { userId })
}

export function declineFriendRequest({ userId, requestId }) {
    return send('put', `/friends/requests/${requestId}/decline`, { userId })
}

export function cancelFriendRequest({ userId, requestId }) {
    return send('delete', `/friends/requests/${requestId}`, { userId })
}

export function removeFriend({ userId, friendUserId }) {
    return send('delete', `/friends/${encodeURIComponent(friendUserId)}`, { userId })
}

export function fetchConversations({ userId }) {
    return get('/conversations', { userId })
}

export function openConversation({ userId, targetUserId }) {
    return send('post', '/conversations', { userId }, { targetUserId })
}

export function fetchMessages({ userId, conversationId, afterId, size = 50 }) {
    return get(`/conversations/${conversationId}/messages`, { userId, afterId, size })
}

export function sendMessage({ userId, conversationId, content }) {
    return send('post', `/conversations/${conversationId}/messages`, { userId }, { content })
}

export function markConversationRead({ userId, conversationId }) {
    return send('put', `/conversations/${conversationId}/read`, { userId })
}

export function fetchFarmCircle({ userId }) {
    return get('/farm-circle', { userId })
}

export function fetchGroupCandidates({ userId }) {
    return get('/group-candidates', { userId })
}

async function sendForm(method, path, params, formData) {
    const response = await axios.request({
        method,
        url: `${SOCIAL_API}${path}`,
        params,
        data: formData,
        withCredentials: true,
    })
    return response.data
}

export function createGroupConversation({ userId, title, memberUserIds = [], photo }) {
    const formData = new FormData()
    memberUserIds.forEach((memberUserId) => formData.append('memberUserIds', memberUserId))
    if (photo) formData.append('photo', photo)
    return sendForm('post', '/conversations/groups', { userId, title }, formData)
}

export function updateGroupConversation({ userId, conversationId, title, photo }) {
    const formData = new FormData()
    if (photo) formData.append('photo', photo)
    return sendForm('put', `/conversations/${conversationId}/group`, { userId, title }, formData)
}

export function addGroupMembers({ userId, conversationId, memberUserIds }) {
    return send('post', `/conversations/${conversationId}/members`, { userId }, { memberUserIds })
}

export function sendAttachmentMessage({ userId, conversationId, content, file }) {
    const formData = new FormData()
    formData.append('file', file)
    return sendForm('post', `/conversations/${conversationId}/attachments`, { userId, content }, formData)
}

// Social files are participant-checked, so the viewer id travels with every request.
export function socialFileUrl(path, userId, { download = false } = {}) {
    if (!path || !userId) return ''
    const separator = path.includes('?') ? '&' : '?'
    const suffix = download ? '&download=true' : ''
    return `${API_ORIGIN}${path}${separator}userId=${encodeURIComponent(userId)}${suffix}`
}

export function formatFileSize(bytes) {
    const size = Number(bytes)
    if (!Number.isFinite(size) || size <= 0) return ''
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageAttachment(message) {
    return Boolean(message?.attachmentUrl) && String(message.attachmentType || '').startsWith('image/')
}

export function conversationTitle(conversation) {
    if (conversation?.type === 'GROUP') return conversation.title || 'Group chat'
    return conversation?.otherUser?.fullName || 'Chat'
}

export function fetchNotifications({ userId, size = 20 }) {
    return get('/notifications', { userId, size })
}

export function markNotificationRead({ userId, notificationId }) {
    return send('put', `/notifications/${notificationId}/read`, { userId })
}

export function markAllNotificationsRead({ userId }) {
    return send('put', '/notifications/read-all', { userId })
}

export function asList(data) {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.content)) return data.content
    return []
}

export function notificationText(notification) {
    if (notification.message) return notification.message
    const name = notification.actor?.fullName || 'Someone'
    switch (notification.type) {
        case 'FRIEND_REQUEST': return `${name} sent you a friend request.`
        case 'FRIEND_ACCEPTED': return `${name} accepted your friend request.`
        case 'POST_COMMENT': return `${name} commented on your post.`
        case 'COMMENT_REPLY': return `${name} replied to your comment.`
        case 'POST_REACTION': return `${name} reacted to your post.`
        default: return `${name} interacted with you.`
    }
}

export function initialsOf(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
}

const PREFS_KEY = 'mannalonSocialPrefs'
export const DEFAULT_SOCIAL_PREFS = { messageSound: true, autoOpenChats: true }

export function loadSocialPrefs() {
    try {
        return { ...DEFAULT_SOCIAL_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }
    } catch {
        return { ...DEFAULT_SOCIAL_PREFS }
    }
}

export function saveSocialPrefs(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function playMessageTone() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (!AudioContextClass) return
        const context = new AudioContextClass()
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = 880
        gain.gain.setValueAtTime(0.08, context.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start()
        oscillator.stop(context.currentTime + 0.25)
        oscillator.onended = () => context.close()
    } catch {
        // Audio is optional; ignore browsers that block it.
    }
}
