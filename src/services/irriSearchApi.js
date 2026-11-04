import axios from 'axios'
import { API_ORIGIN } from './farmerApi.js'

export async function searchIrri({ query, page = 0 }, signal) {
    const response = await axios.get(`${API_ORIGIN}/api/search/irri`, {
        params: { q: query, page, size: 10 }, withCredentials: true, signal, timeout: 20000,
    })
    const data = response.data
    if (!Array.isArray(data?.items) || data.page !== page || data.size !== 10
        || typeof data.hasNext !== 'boolean' || data.items.length > 10 || (!data.items.length && data.hasNext)) {
        throw new Error('The backend returned an invalid IRRI search page.')
    }
    for (const item of data.items) {
        if (!item || typeof item.url !== 'string') throw new Error('The backend returned an invalid IRRI resource link.')
        let url
        try {
            url = new URL(item.url)
        } catch {
            throw new Error('The backend returned an invalid IRRI resource link.')
        }
        if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')
            || !(url.hostname === 'irri.org' || url.hostname.endsWith('.irri.org'))
            || typeof item.title !== 'string' || !item.title.trim()
            || typeof item.snippet !== 'string') {
            throw new Error('The backend returned an unverified IRRI resource. Results cannot be displayed.')
        }
    }
    return data
}

export function irriSearchError(error) {
    const status = error.response?.status
    if (status === 401) return 'Please sign in again to search IRRI resources.'
    if (status === 403) return 'Permission denied. Your account cannot search IRRI resources.'
    if (status === 404 || status === 501) return 'Integrated IRRI search is not available on the backend yet.'
    if (status === 400) return 'Enter a valid IRRI search query of 2-200 characters.'
    if (status === 429) return 'IRRI search is rate-limited. Please try again later.'
    if ([502, 503, 504].includes(status) || error.code === 'ECONNABORTED') {
        return 'The IRRI search provider is unavailable or timed out. Please try again later.'
    }
    return error.response ? 'IRRI search failed. Please try again.' : error.message || 'IRRI search failed. Check your connection.'
}
