import axios from 'axios'
import { API_ORIGIN } from './farmerApi.js'

const api = axios.create({ baseURL: `${API_ORIGIN}/api`, withCredentials: true })

export const fetchManagedUsers = async (query, signal) => (await api.get('/admin/users', { params: query, signal })).data
export const fetchCurrentAdmin = async () => (await api.get('/admin/users/me')).data
export const createAdminAccount = async (fields) => (await api.post('/admin/users/admins', fields)).data
export const fetchMemberInfo = async (id, signal) => (await api.get(`/admin/users/${id}/info`, { signal })).data
export const updateMemberInfo = async (id, fields) => (await api.put(`/admin/users/${id}/info`, fields)).data
export const changeUserStatus = async (id, fields) => (await api.put(`/admin/users/${id}/status`, fields)).data
export const deactivateCurrentAdmin = async (password) => api.post('/admin/users/me/deactivate', { password })
export const fetchAccountAppeals = async (query, signal) => (await api.get('/admin/users/appeals', { params: query, signal })).data
export const reviewAccountAppeal = async (id, fields) => (await api.put(`/admin/users/appeals/${id}`, fields)).data
export const fetchAppealAccess = async () => (await api.get('/auth/appeal')).data
export const submitAccountAppeal = async (message) => (await api.post('/auth/appeal', { message })).data
export const logoutAccount = async () => api.post('/auth/logout')

export function accountError(error) {
    const data = error.response?.data
    return data?.errors ? Object.values(data.errors).join(' ') : data?.message || data?.detail || 'Request failed. Please try again.'
}
