import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = 'http://localhost:8080/api/farm-admin/registrations'

function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString()
}

function statusClass(status) {
    return `status-badge status-${String(status || '').toLowerCase()}`
}

function AdminFarmManagement() {
    const [registrations, setRegistrations] = useState([])
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('ALL')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let isActive = true

        async function loadFarmRegistrations() {
            try {
                setIsLoading(true)
                setError('')
                const query = status === 'ALL' ? '' : `?status=${encodeURIComponent(status)}`
                const response = await fetch(`${API_URL}${query}`, {
                    credentials: 'include',
                })
                if (!response.ok) throw new Error('Unable to load farm registrations.')
                const data = await response.json()
                if (isActive) setRegistrations(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setError(requestError.message)
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        loadFarmRegistrations()
        return () => { isActive = false }
    }, [status])

    const visibleRegistrations = registrations.filter((registration) => {
        const searchText = search.trim().toLowerCase()
        return !searchText || [
            registration.registrationId,
            registration.farmName,
            registration.farmCode,
        ].some((value) => String(value || '').toLowerCase().includes(searchText))
    })

    return (
        <section className="admin-fo-page">
            <div className="admin-fo-header">
                <div>
                    <p className="admin-eyebrow">FARM MANAGEMENT</p>
                    <h2>Farm Registration List</h2>
                    <p className="admin-section-description">Review Farm-Admin farm registrations and their approval status.</p>
                </div>
                <div className="admin-fo-controls">
                    <label>
                        <span>Search</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Farm name, code, or ID"
                        />
                    </label>
                    <label>
                        <span>Status</span>
                        <select value={status} onChange={(event) => setStatus(event.target.value)}>
                            <option value="ALL">All statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </label>
                </div>
            </div>

            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
            {isLoading ? <p className="admin-loading">Loading farm registrations...</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-data-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Registration ID</th>
                                <th>Farm name</th>
                                <th>Farm code</th>
                                <th>Submitted</th>
                                <th>Rejection reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRegistrations.map((registration) => (
                                <tr key={registration.registrationId}>
                                    <td><span className={statusClass(registration.status)}>{registration.status}</span></td>
                                    <td>{registration.registrationId}</td>
                                    <td><Link className="admin-table-link" to={`/admin/farm-management/${registration.registrationId}`}>{registration.farmName || '-'}</Link></td>
                                    <td>{registration.farmCode || '-'}</td>
                                    <td>{formatDate(registration.createdAt)}</td>
                                    <td>{registration.rejectionReason || '-'}</td>
                                </tr>
                            ))}
                            {!visibleRegistrations.length && (
                                <tr><td className="admin-table-empty" colSpan="6">No farm registrations match the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

export default AdminFarmManagement