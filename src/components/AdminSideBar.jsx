import { useLocation, useNavigate } from 'react-router-dom'
import { NAV_SECTIONS, getActivePath } from './adminNav.js'

function AdminSideBar({ collapsed, onToggle }) {
    const navigate = useNavigate()
    const activePath = getActivePath(useLocation().pathname)

    return (
        <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <span className="sidebar-brand-mark">M</span>
                    <div className="sidebar-brand-text">
                        <h1>Admin Panel</h1>
                        <p>MannalonApp</p>
                    </div>
                </div>
                <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
                    </svg>
                </button>
            </div>
            <nav className="sidebar-nav" aria-label="Admin navigation">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.label} className="sidebar-section">
                        <p className="sidebar-section-label">{section.label}</p>
                        <ul className="sidebar-menu">
                            {section.items.map((item) => (
                                <li key={item.path}>
                                    <button
                                        type="button"
                                        className={`sidebar-btn${item.path === activePath ? ' active' : ''}`}
                                        title={item.label}
                                        aria-current={item.path === activePath ? 'page' : undefined}
                                        onClick={() => navigate(item.path)}
                                    >
                                        <svg className="sidebar-icn" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d={item.icon} />
                                        </svg>
                                        <span className="sidebar-text">{item.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    )
}

export default AdminSideBar
