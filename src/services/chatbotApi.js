import axios from 'axios'
import { API_ORIGIN } from './farmerApi.js'

const api = axios.create({ baseURL: API_ORIGIN, withCredentials: true, timeout: 150000 })

export async function askChatbot({ conversationId, question }) {
    const response = await api.post('/api/farmer/chatbot/messages', { conversationId, question })
    return response.data
}

export async function fetchChatbotHistory() {
    const response = await api.get('/api/farmer/chatbot/history')
    return response.data
}

export async function fetchChatbotRecords({ page, category }) {
    const response = await api.get('/api/admin/chatbot/records', { params: { page, category: category || undefined } })
    return response.data
}

export function chatbotError(error) {
    const data = error.response?.data
    if (data?.errors) return Object.values(data.errors).join(' ')
    if (error.response?.status === 401 || error.response?.status === 403) {
        return 'Your session has expired or this account cannot access these records. Please log in with the correct role.'
    }
    return data?.message || data?.detail || 'The chatbot request failed. Check your connection and try again.'
}
