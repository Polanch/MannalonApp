import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = 'http://localhost:8080/api/admin/farm-admin-applications'

function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString()
}

function statusClass(status) {
    return `status-badge status-${String(status || '').toLowerCase()}`
}

function AdminFarmOwners() {
    const [registrations, setRegistrations] = useState([])
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('ALL')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [isProvisioning, setIsProvisioning] = useState(false)
    const [provisionMessage, setProvisionMessage] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let isActive = true

        async function loadRegistrations() {
            try {
                setIsLoading(true)
                setError('')
                const query = status === 'ALL' ? '' : `?status=${encodeURIComponent(status)}`
                const response = await fetch(`${API_URL}${query}`, {
                    credentials: 'include',
                })
                if (!response.ok) throw new Error('Unable to load farm-owner registrations.')
                const data = await response.json()
                if (isActive) setRegistrations(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setError(requestError.message)
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        loadRegistrations()
        return () => { isActive = false }
    }, [status, refreshKey])

    async function provisionApprovedAccounts() {
        try {
            setIsProvisioning(true)
            setError('')
            setProvisionMessage('')
            const response = await fetch(`${API_URL}/provision-users`, {
                method: 'POST',
                credentials: 'include',
            })
            if (!response.ok) {
                const responseText = await response.text()
                throw new Error(responseText || 'Unable to provision approved Farm-Admin accounts.')
            }

            const result = await response.json().catch(() => null)
            setProvisionMessage(result?.message || 'Approved Farm-Admin accounts were provisioned for login.')
            setRefreshKey((currentKey) => currentKey + 1)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setIsProvisioning(false)
        }
    }

    const visibleRegistrations = registrations.filter((registration) => {
        const searchText = search.trim().toLowerCase()
        const matchesSearch = !searchText || [
            registration.registrationId,
            registration.email,
            registration.firstName,
            registration.surname,
            registration.personalEmail,
        ].some((value) => String(value || '').toLowerCase().includes(searchText))
        return matchesSearch
    })

    return (
        <section className="admin-fo-page">
            <div className="admin-fo-header">
                <div>
                    <p className="admin-eyebrow">USER MANAGEMENT</p>
                    <h2>Farm Owner List</h2>
                    <p className="admin-section-description">Review submitted farm-owner registrations and their verification status.</p>
                </div>
                <div className="admin-fo-controls">
                    <label>
                        <span>Search</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Name, email, or ID"
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
                    <button
                        type="button"
                        className="admin-button admin-button-secondary"
                        onClick={provisionApprovedAccounts}
                        disabled={isProvisioning}
                    >
                        {isProvisioning ? 'Provisioning...' : 'Provision Approved Accounts'}
                    </button>
                </div>
            </div>

            {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
            {provisionMessage && <p className="admin-toast admin-toast-success" role="status">{provisionMessage}</p>}
            {isLoading ? <p className="admin-loading">Loading farm-owner registrations...</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-data-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Registration ID</th>
                                <th>Email</th>
                                <th>First name</th>
                                <th>Surname</th>
                                <th>MI</th>
                                <th>Extension</th>
                                <th>Mobile number</th>
                                <th>Personal email</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRegistrations.map((registration) => (
                                <tr key={registration.registrationId}>
                                    <td><span className={statusClass(registration.status)}>{registration.status}</span></td>
                                    <td><Link className="admin-table-link" to={`/admin/${registration.registrationId}`}>{registration.registrationId}</Link></td>
                                    <td>{registration.email || '-'}</td>
                                    <td>{registration.firstName || '-'}</td>
                                    <td>{registration.surname || '-'}</td>
                                    <td>{registration.middleInitial || '-'}</td>
                                    <td>{registration.nameExtension || '-'}</td>
                                    <td>{registration.mobileNumber || '-'}</td>
                                    <td>{registration.personalEmail || '-'}</td>
                                    <td>{formatDate(registration.submittedAt)}</td>
                                </tr>
                            ))}
                            {!visibleRegistrations.length && (
                                <tr><td className="admin-table-empty" colSpan="10">No registrations match the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

export default AdminFarmOwners
