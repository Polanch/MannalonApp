import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminTicketOverview from './AdminTicketOverview.jsx'
import PublicFarmMap from './PublicFarmMap.jsx'
import useTicketResource from '../hooks/useTicketResource.js'
import { fetchTicketInsights, TICKET_STATUSES } from '../services/ticketingApi.js'

const API = 'http://localhost:8080/api/admin'

async function countOf(path) {
    try {
        const response = await fetch(`${API}${path}`, { credentials: 'include' })
        if (!response.ok) return null
        const data = await response.json()
        return Array.isArray(data) ? data.length : null
    } catch {
        return null
    }
}

function AdminDashboard() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({ approvedFarmers: null, programs: null })
    const loadTickets = useCallback(async (signal) => {
        // The insights endpoint otherwise defaults to tickets created in the last 30 days.
        const data = await fetchTicketInsights({
            from: '1970-01-01T00:00:00', to: new Date().toISOString().slice(0, -1),
        }, signal)
        if (TICKET_STATUSES.some((status) => data.byStatus.filter((group) => group.key === status).length !== 1)
            || data.byStatus.some((group) => !Number.isInteger(group.count) || group.count < 0)) {
            throw new Error('The backend returned incomplete or invalid ticket status counts.')
        }
        return data
    }, [])
    const tickets = useTicketResource(loadTickets)

    useEffect(() => {
        let isActive = true

        async function load() {
            const [approvedFarmers, programs] = await Promise.all([
                countOf('/farmer-registrations?status=APPROVED'),
                countOf('/programs'),
            ])
            if (isActive) setStats({ approvedFarmers, programs })
        }

        load()
        return () => { isActive = false }
    }, [])

    const cards = [
        { label: 'Approved Farmer accounts', value: stats.approvedFarmers, path: '/admin/users', tone: 'ok' },
        { label: 'Programs', value: stats.programs, path: '/admin/programs', tone: 'info' },
    ]

    const shortcuts = [
        { label: 'Open RSBSA directory', description: 'Look up registry records or upload an updated directory.', path: '/admin/farmers' },
        { label: 'Create a Program', description: 'Publish benefits and set eligibility requirements.', path: '/admin/programs' },
        { label: 'Review Farm Admins', description: 'Check Farm-Admin registrations.', path: '/admin/farm-owners' },
    ]

    return (
        <section className="admin-fo-page">
            <div className="admin-fo-header">
                <div>
                    <p className="admin-eyebrow">OVERVIEW</p>
                    <h2>Dashboard</h2>
                    <p className="admin-section-description">What needs your attention across MannalonApp.</p>
                </div>
            </div>

            <div className="admin-stat-grid">
                {cards.map((card) => (
                    <button key={card.label} type="button" className={`admin-stat-card admin-stat-${card.tone}`} onClick={() => navigate(card.path)}>
                        <span className="admin-stat-value">{card.value ?? '-'}</span>
                        <span className="admin-stat-label">{card.label}</span>
                    </button>
                ))}
            </div>

            <AdminTicketOverview resource={tickets} onOpenTickets={() => navigate('/admin/tickets')} />

            <h3 className="admin-dashboard-subtitle">Quick actions</h3>
            <div className="admin-shortcut-grid">
                {shortcuts.map((shortcut) => (
                    <button key={shortcut.label} type="button" className="admin-shortcut-card" onClick={() => navigate(shortcut.path)}>
                        <strong>{shortcut.label}</strong>
                        <span>{shortcut.description}</span>
                    </button>
                ))}
            </div>
            <div className="admin-dashboard-map">
                <PublicFarmMap />
            </div>
        </section>
    )
}

export default AdminDashboard
