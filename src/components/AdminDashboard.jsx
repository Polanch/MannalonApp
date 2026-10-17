import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
    const [stats, setStats] = useState({ pendingFarmers: null, approvedFarmers: null, programs: null })

    useEffect(() => {
        let isActive = true

        async function load() {
            const [pendingFarmers, approvedFarmers, programs] = await Promise.all([
                countOf('/farmer-registrations?status=PENDING_ADMIN'),
                countOf('/farmer-registrations?status=APPROVED'),
                countOf('/programs'),
            ])
            if (isActive) setStats({ pendingFarmers, approvedFarmers, programs })
        }

        load()
        return () => { isActive = false }
    }, [])

    const cards = [
        { label: 'Farmers awaiting RSBSA validation', value: stats.pendingFarmers, path: '/admin/farmers', tone: 'warn' },
        { label: 'Active Farmers', value: stats.approvedFarmers, path: '/admin/farmers', tone: 'ok' },
        { label: 'Programs', value: stats.programs, path: '/admin/programs', tone: 'info' },
    ]

    const shortcuts = [
        { label: 'Review Farmer RSBSA', description: 'Validate Farmers approved by their Farm-Admin.', path: '/admin/farmers' },
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

            <h3 className="admin-dashboard-subtitle">Quick actions</h3>
            <div className="admin-shortcut-grid">
                {shortcuts.map((shortcut) => (
                    <button key={shortcut.label} type="button" className="admin-shortcut-card" onClick={() => navigate(shortcut.path)}>
                        <strong>{shortcut.label}</strong>
                        <span>{shortcut.description}</span>
                    </button>
                ))}
            </div>
        </section>
    )
}

export default AdminDashboard
