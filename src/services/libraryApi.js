import axios from 'axios'
import { API_ORIGIN } from './farmerApi.js'

const api = axios.create({ baseURL: `${API_ORIGIN}/api/library`, withCredentials: true })

export async function fetchLibraryGenres() {
    return (await api.get('/genres')).data
}

export async function createLibraryGenre(name) {
    return (await api.post('/genres', { name })).data
}

export async function fetchLibraryBooks({ search, genreId, savedOnly, page }, signal) {
    return (await api.get('/books', { params: { search, genreId: genreId || undefined, savedOnly, page }, signal })).data
}

export async function fetchLibraryBook(id, signal) {
    return (await api.get(`/books/${id}`, { signal })).data
}

export async function uploadLibraryBook({ details, pdf, cover }) {
    const data = new FormData()
    data.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }))
    data.append('pdf', pdf)
    data.append('cover', cover)
    return (await api.post('/books', data)).data
}

export async function updateLibraryBook(id, details) {
    return (await api.put(`/books/${id}`, details)).data
}

export async function setLibraryBookSaved(id, saved) {
    if (saved) await api.put(`/books/${id}/saved`)
    else await api.delete(`/books/${id}/saved`)
}

export function libraryError(error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
        return 'Please log in with an authorized account to access the library.'
    }
    const data = error.response?.data
    return data?.errors ? Object.values(data.errors).join(' ') : data?.message || data?.detail || 'Library request failed. Check your connection and try again.'
}
