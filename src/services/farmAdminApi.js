import axios from 'axios'
import { API_ORIGIN } from './farmerApi.js'

const ANNOUNCEMENTS_API = `${API_ORIGIN}/api/farm-admin/announcements`

export function getFarmAdminSession() {
    const userId = sessionStorage.getItem('farmAdminUserId') || ''
    return {
        userId,
        fullName: sessionStorage.getItem('farmAdminName') || userId,
        profilePictureUrl: sessionStorage.getItem('farmAdminProfilePictureUrl') || '',
    }
}

export async function fetchAnnouncements({ userId }) {
    const response = await axios.get(ANNOUNCEMENTS_API, { params: { userId }, withCredentials: true })
    return response.data
}

export async function createAnnouncement({ userId, title, content, image }) {
    const formData = new FormData()
    formData.append('userId', userId)
    formData.append('title', title)
    formData.append('content', content)
    if (image) {
        formData.append('image', image)
    }

    const response = await axios.post(ANNOUNCEMENTS_API, formData, { withCredentials: true })
    return response.data
}

export async function deleteAnnouncement({ id, userId }) {
    await axios.delete(`${ANNOUNCEMENTS_API}/${id}`, { params: { userId }, withCredentials: true })
}
