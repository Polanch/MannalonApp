import axios from 'axios'

export const API_ORIGIN = 'http://localhost:8080'
const FARMER_API = `${API_ORIGIN}/api/farmer`
const SESSION_KEY = 'farmerSession'

export function buildFarmerSession(loginData, fallbackUserId) {
    const firstName = loginData.firstName || ''
    const lastName = loginData.lastName || ''
    const fullName = loginData.fullName || loginData.name || `${firstName} ${lastName}`.trim()

    return {
        userId: loginData.userId || fallbackUserId,
        firstName,
        lastName,
        fullName: fullName || fallbackUserId,
        farmId: loginData.farmId ?? null,
    }
}

export function saveFarmerSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getFarmerSession() {
    try {
        const session = JSON.parse(sessionStorage.getItem(SESSION_KEY))
        return session?.userId ? session : null
    } catch {
        return null
    }
}

export function clearFarmerSession() {
    sessionStorage.removeItem(SESSION_KEY)
}

export function resolveMediaUrl(path) {
    if (!path) {
        return ''
    }
    return /^https?:\/\//i.test(path) ? path : `${API_ORIGIN}${path}`
}

export function getApiErrorMessage(error, fallback) {
    const data = error.response?.data
    return data?.message || data?.detail || data?.error || fallback
}

export async function fetchPosts({ userId, page, size }) {
    const response = await axios.get(`${FARMER_API}/posts`, {
        params: { userId, page, size },
        withCredentials: true,
    })
    return response.data
}

export async function createPost({ userId, content, media }) {
    const formData = new FormData()
    formData.append('userId', userId)
    formData.append('content', content)
    if (media) {
        formData.append('media', media)
    }

    const response = await axios.post(`${FARMER_API}/posts`, formData, { withCredentials: true })
    return response.data
}

export async function setPostReaction({ postId, userId, reaction }) {
    const response = await axios.put(
        `${FARMER_API}/posts/${postId}/reaction`,
        { userId, reaction },
        { withCredentials: true },
    )
    return response.data
}

export async function fetchComments({ postId }) {
    const response = await axios.get(`${FARMER_API}/posts/${postId}/comments`, { withCredentials: true })
    return response.data
}

export async function createComment({ postId, userId, content }) {
    const response = await axios.post(
        `${FARMER_API}/posts/${postId}/comments`,
        { userId, content },
        { withCredentials: true },
    )
    return response.data
}

export function formatRelativeTime(isoDate) {
    const timestamp = new Date(isoDate).getTime()
    if (Number.isNaN(timestamp)) {
        return ''
    }

    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ]

    for (const [unit, unitSeconds] of units) {
        const value = Math.floor(seconds / unitSeconds)
        if (value >= 1) {
            return `${value} ${unit}${value > 1 ? 's' : ''} ago`
        }
    }
    return 'just now'
}
