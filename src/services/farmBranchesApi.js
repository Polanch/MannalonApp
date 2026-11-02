import { API_ORIGIN } from './farmerApi.js'

async function request(path, options = {}) {
    const response = await fetch(`${API_ORIGIN}/api/farm-admin${path}`, {
        ...options, credentials: 'include',
    })
    if (!response.ok) {
        const text = await response.text()
        let detail = ''
        if (text && !text.trimStart().startsWith('<')) {
            try {
                const data = JSON.parse(text)
                detail = data.errors ? Object.values(data.errors).flat().join(' ') : data.message || data.detail || data.error || ''
            } catch {
                detail = text
            }
        }
        const message = {
            400: 'Check the branch registration fields.',
            401: 'Please sign in again.',
            403: 'You do not have permission to manage branches for this farm.',
            404: 'Branch registration support is not available on the backend yet.',
            409: 'The farm or Farmer eligibility changed. Reload before submitting again.',
        }[response.status] || 'Unable to complete the branch request.'
        throw new Error(`${message}${detail ? ` ${detail}` : ''}`)
    }
    return response.json()
}

export async function fetchBranchOwners(parentFarmId, signal) {
    const data = await request(`/farms/${parentFarmId}/branch-owners`, { signal })
    if (!Array.isArray(data) || data.some((owner) => !Number.isInteger(owner.globalId) || typeof owner.fullName !== 'string')) {
        throw new Error('The backend returned an invalid list of eligible Farmer accounts.')
    }
    return data
}

export async function submitBranchRegistration(parent, ownerGlobalId, formData) {
    if (!Number.isInteger(parent.farmId) || parent.parentFarmId != null || parent.status !== 'APPROVED' || !parent.farmCode) {
        throw new Error('Select an approved main farm with an existing farm code.')
    }
    if (!Number.isInteger(ownerGlobalId) || ownerGlobalId <= 0) throw new Error('Select an eligible Farmer account.')
    const body = new FormData()
    for (const [key, value] of formData) body.append(key, value)
    body.set('ownerGlobalId', String(ownerGlobalId))
    const data = await request(`/farms/${parent.farmId}/branch-registrations`, { method: 'POST', body })
    if (!Number.isInteger(data?.registrationId) || data.parentFarmId !== parent.farmId
        || data.ownerGlobalId !== ownerGlobalId || data.farmCode !== parent.farmCode || data.status !== 'PENDING') {
        throw new Error('The server response did not confirm a pending branch under the same farm code. Check My Registered Farms before retrying.')
    }
    return data
}
