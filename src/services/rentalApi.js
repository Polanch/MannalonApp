import axios from 'axios'
import { API_ORIGIN, getApiErrorMessage } from './farmerApi.js'

const RENTAL_API = `${API_ORIGIN}/api/rentals`
const client = axios.create({ baseURL: RENTAL_API, withCredentials: true })

export const RENTAL_CATEGORIES = [
    ['ALL', 'All categories'],
    ['TRACTORS', 'Tractors'],
    ['HAND_TOOLS', 'Hand tools'],
    ['PLANTING', 'Planting'],
    ['IRRIGATION', 'Irrigation'],
    ['HARVESTING', 'Harvesting'],
    ['POST_HARVEST', 'Post-harvest'],
    ['TRANSPORT', 'Transport'],
    ['OTHER', 'Other'],
]

export function rentalImageUrl(path) {
    return path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`
}

export function rentalError(error, fallback) {
    return getApiErrorMessage(error, fallback)
}

export async function fetchRentalWorkspace() {
    const [items, listings, borrowed, lent] = await Promise.all([
        client.get('/items'),
        client.get('/mine/listings'),
        client.get('/mine/borrowed'),
        client.get('/mine/lent'),
    ])
    return {
        items: items.data,
        listings: listings.data,
        borrowed: borrowed.data,
        lent: lent.data,
    }
}

export async function createRentalItem(fields, image) {
    const formData = new FormData()
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value))
    formData.append('image', image)
    return (await client.post('/items', formData)).data
}

export async function requestRental(itemId, requestedReturnAt) {
    return (await client.post(`/items/${itemId}/requests`, { requestedReturnAt })).data
}

export async function approveRental(bookingId) {
    return (await client.put(`/bookings/${bookingId}/approve`, {})).data
}

export async function rejectRental(bookingId) {
    return (await client.put(`/bookings/${bookingId}/reject`, {})).data
}

export async function cancelRental(bookingId) {
    return (await client.put(`/bookings/${bookingId}/cancel`)).data
}

export async function markRentalReturned(bookingId) {
    return (await client.put(`/bookings/${bookingId}/return`)).data
}
