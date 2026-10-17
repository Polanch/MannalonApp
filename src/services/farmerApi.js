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
        profilePictureUrl: loginData.profilePictureUrl || '',
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

export async function fetchPosts({ userId, authorId, page, size }) {
    const response = await axios.get(`${FARMER_API}/posts`, {
        params: { userId, authorId, page, size },
        withCredentials: true,
    })
    return response.data
}

export async function fetchProfile({ userId }) {
    const response = await axios.get(`${FARMER_API}/profile`, {
        params: { userId },
        withCredentials: true,
    })
    return response.data
}

export async function updateProfile({ userId, fields, profilePicture, coverPhoto }) {
    const formData = new FormData()
    formData.append('userId', userId)
    Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value)
        }
    })
    if (profilePicture) {
        formData.append('profilePicture', profilePicture)
    }
    if (coverPhoto) {
        formData.append('coverPhoto', coverPhoto)
    }

    const response = await axios.put(`${FARMER_API}/profile`, formData, { withCredentials: true })
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

export async function fetchComments({ postId, userId, resource = 'posts' }) {
    const response = await axios.get(`${FARMER_API}/${resource}/${postId}/comments`, {
        params: { userId },
        withCredentials: true,
    })
    return response.data
}

export async function createComment({ postId, userId, content, parentCommentId, resource = 'posts' }) {
    const response = await axios.post(
        `${FARMER_API}/${resource}/${postId}/comments`,
        { userId, content, parentCommentId: parentCommentId ?? null },
        { withCredentials: true },
    )
    return response.data
}

export async function setCommentReaction({ postId, commentId, userId, reaction, resource = 'posts' }) {
    const response = await axios.put(
        `${FARMER_API}/${resource}/${postId}/comments/${commentId}/reaction`,
        { userId, reaction },
        { withCredentials: true },
    )
    return response.data
}

export async function fetchFarmerAnnouncements({ userId }) {
    const response = await axios.get(`${FARMER_API}/announcements`, {
        params: { userId },
        withCredentials: true,
    })
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

export async function fetchPrograms({ userId }) {
    const response = await axios.get(`${FARMER_API}/programs`, {
        params: { userId },
        withCredentials: true,
    })
    return response.data
}

export function getRequirementId(requirement) {
    return requirement?.id ?? requirement?.requirementId ?? null
}

export async function applyToProgram({ programId, userId, requirements, files }) {
    const formData = new FormData()
    formData.append('userId', userId)
    requirements.forEach((requirement) => {
        const requirementId = getRequirementId(requirement)
        if (requirementId != null && files[requirementId]) {
            formData.append(`requirement_${requirementId}`, files[requirementId])
        }
    })

    const response = await axios.post(`${FARMER_API}/programs/${programId}/apply`, formData, { withCredentials: true })
    return response.data
}

export async function fetchProgramBenefit({ programId, userId }) {
    const response = await axios.get(`${FARMER_API}/programs/${programId}/benefit`, {
        params: { userId },
        withCredentials: true,
    })
    return response.data
}

export async function setProgramVote({ programId, userId, vote }) {
    const response = await axios.put(
        `${FARMER_API}/programs/${programId}/vote`,
        { userId, vote },
        { withCredentials: true },
    )
    return response.data
}

export async function fetchTimeEntries({ userId }) {
    const response = await axios.get(`${FARMER_API}/farmte/time-entries`, { params: { userId }, withCredentials: true })
    return response.data
}

export async function createTimeEntry({ userId, date, activity, hours, notes, seasonId }) {
    const response = await axios.post(`${FARMER_API}/farmte/time-entries`, { userId, date, activity, hours: Number(hours), notes: notes || null, seasonId: seasonId ? Number(seasonId) : null }, { withCredentials: true })
    return response.data
}

export async function deleteTimeEntry({ id, userId }) {
    await axios.delete(`${FARMER_API}/farmte/time-entries/${id}`, { params: { userId }, withCredentials: true })
}

export async function fetchExpenseEntries({ userId }) {
    const response = await axios.get(`${FARMER_API}/farmte/expense-entries`, { params: { userId }, withCredentials: true })
    return response.data
}

export async function createExpenseEntry({ userId, date, category, amount, notes, seasonId }) {
    const response = await axios.post(`${FARMER_API}/farmte/expense-entries`, { userId, date, category, amount: Number(amount), notes: notes || null, seasonId: seasonId ? Number(seasonId) : null }, { withCredentials: true })
    return response.data
}

export async function deleteExpenseEntry({ id, userId }) {
    await axios.delete(`${FARMER_API}/farmte/expense-entries/${id}`, { params: { userId }, withCredentials: true })
}

export async function submitFarmReport({ userId, periodStart, periodEnd }) {
    const response = await axios.post(`${FARMER_API}/farmte/reports`, { userId, periodStart, periodEnd }, { withCredentials: true })
    return response.data
}

export async function fetchFarmReports({ userId }) {
    const response = await axios.get(`${FARMER_API}/farmte/reports`, { params: { userId }, withCredentials: true })
    return response.data
}

export async function fetchSeasons({ userId, farmId }) {
    const response = await axios.get(`${FARMER_API}/farmte/seasons`, { params: { userId, farmId }, withCredentials: true })
    return response.data
}

export async function createSeason({ userId, commodity, variety, seasonType, areaHa, plantingDate, irrigation }) {
    const response = await axios.post(
        `${FARMER_API}/farmte/seasons`,
        { commodity, variety: variety || null, seasonType, areaHa: Number(areaHa), plantingDate: plantingDate || null, irrigation: irrigation || null },
        { params: { userId }, withCredentials: true },
    )
    return response.data
}

export async function closeSeason({ userId, seasonId }) {
    const response = await axios.put(`${FARMER_API}/farmte/seasons/${seasonId}/close`, null, { params: { userId }, withCredentials: true })
    return response.data
}

export async function fetchSeasonSummary({ seasonId }) {
    const response = await axios.get(`${FARMER_API}/farmte/seasons/${seasonId}/summary`, { withCredentials: true })
    return response.data
}

export async function fetchHarvests({ seasonId }) {
    const response = await axios.get(`${FARMER_API}/farmte/harvests`, { params: { seasonId }, withCredentials: true })
    return response.data
}

export async function createHarvest({ userId, seasonId, harvestDate, sacks, kgPerSack, condition, notes }) {
    const response = await axios.post(
        `${FARMER_API}/farmte/harvests`,
        { seasonId: Number(seasonId), harvestDate, sacks: Number(sacks), kgPerSack: Number(kgPerSack), condition, notes: notes || null },
        { params: { userId }, withCredentials: true },
    )
    return response.data
}

export async function deleteHarvest({ id, userId }) {
    await axios.delete(`${FARMER_API}/farmte/harvests/${id}`, { params: { userId }, withCredentials: true })
}

export async function fetchSales({ seasonId }) {
    const response = await axios.get(`${FARMER_API}/farmte/sales`, { params: { seasonId }, withCredentials: true })
    return response.data
}

export async function createSale({ userId, seasonId, saleDate, kgSold, pricePerKg, condition, buyerType, locationBarangay, locationMunicipality }) {
    const response = await axios.post(
        `${FARMER_API}/farmte/sales`,
        {
            seasonId: Number(seasonId),
            saleDate,
            kgSold: Number(kgSold),
            pricePerKg: Number(pricePerKg),
            condition,
            buyerType,
            locationBarangay: locationBarangay || null,
            locationMunicipality: locationMunicipality || null,
        },
        { params: { userId }, withCredentials: true },
    )
    return response.data
}

export async function deleteSale({ id, userId }) {
    await axios.delete(`${FARMER_API}/farmte/sales/${id}`, { params: { userId }, withCredentials: true })
}
