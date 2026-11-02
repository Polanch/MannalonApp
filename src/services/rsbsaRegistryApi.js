import { API_ORIGIN } from './farmerApi.js'

const API_URL = `${API_ORIGIN}/api/rsbsa-registry`
const IMPORT_URL = `${API_ORIGIN}/api/admin/rsbsa-registry/import`

async function getErrorMessage(response, fallback) {
    const text = await response.text()
    if (!text || text.trimStart().startsWith('<')) return fallback

    try {
        const data = JSON.parse(text)
        return data.message || data.detail || data.error || fallback
    } catch {
        return text
    }
}

export async function fetchRsbsaRegistry({ search, page, size }, signal) {
    const query = new URLSearchParams({ search, page: String(page), size: String(size) })
    const response = await fetch(`${API_URL}?${query}`, { credentials: 'include', signal })
    if (!response.ok) {
        const fallback = response.status === 404
            ? 'The RSBSA directory API is not available yet. Ask the backend developer to implement GET /api/rsbsa-registry.'
            : 'Unable to load the RSBSA directory.'
        throw new Error(await getErrorMessage(response, fallback))
    }

    const data = await response.json()
    if (!data || !Array.isArray(data.items) || !Number.isInteger(data.total)) {
        throw new Error('The RSBSA directory response is invalid. Ask the backend developer to return items and total.')
    }
    return data
}

export async function importRsbsaRegistry(file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(IMPORT_URL, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    })
    if (!response.ok) {
        const fallback = response.status === 404
            ? 'The RSBSA import API is not available yet. Ask the backend developer to implement POST /api/admin/rsbsa-registry/import.'
            : 'Unable to import the RSBSA file.'
        throw new Error(await getErrorMessage(response, fallback))
    }

    const data = await response.json()
    if (!data || !Number.isInteger(data.importedCount) || !Number.isInteger(data.updatedCount) || !Number.isInteger(data.skippedCount)) {
        throw new Error('The RSBSA import response is invalid. Ask the backend developer to return importedCount, updatedCount, and skippedCount.')
    }
    return data
}
