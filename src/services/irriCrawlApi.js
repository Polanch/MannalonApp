import axios from 'axios'
import { API_ORIGIN } from './farmerApi.js'

const api = axios.create({ baseURL: `${API_ORIGIN}/api/admin/chatbot/ingest-irri`, withCredentials: true, timeout: 20000 })
const STATUSES = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']

export async function queueIrriCrawl() {
    const { status, data } = await api.post('')
    if (status !== 202 || !Number.isInteger(data?.jobId) || data.jobId <= 0
        || !['QUEUED', 'RUNNING'].includes(data.status) || typeof data.message !== 'string') {
        throw new Error('The backend did not confirm an IRRI crawl job. Refresh progress before retrying.')
    }
    return data
}

export async function fetchIrriCrawlProgress(signal) {
    const { data } = await api.get('/progress', { signal })
    if (!Number.isInteger(data?.jobId) || data.jobId <= 0 || !STATUSES.includes(data.status)
        || ['discovered', 'indexed', 'unchanged', 'skipped', 'failed'].some((key) => !Number.isInteger(data[key]) || data[key] < 0)
        || typeof data.limitsReached !== 'boolean' || typeof data.message !== 'string'
        || !(data.lastRefresh === null || typeof data.lastRefresh === 'string')) {
        throw new Error('The backend returned invalid IRRI crawl progress.')
    }
    return data
}

export function irriCrawlError(error) {
    const status = error.response?.status
    if (status === 401) return 'Please sign in again to manage IRRI indexing.'
    if (status === 403) return 'Permission denied. Only Admin and MAO-Admin accounts can manage IRRI indexing.'
    if (status === 404) return 'No IRRI crawl progress is available. There may be no job yet, or the backend endpoint is unavailable.'
    if (status === 503) return 'IRRI crawling is disabled or unavailable. Check backend configuration.'
    if (error.code === 'ECONNABORTED') return 'IRRI crawl request timed out. Refresh progress before retrying.'
    return error.response?.data?.message || error.response?.data?.detail || error.message || 'Unable to manage IRRI indexing.'
}
