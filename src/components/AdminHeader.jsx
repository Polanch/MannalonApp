import { useLocation } from 'react-router-dom'
import { getAdminPageTitle } from './adminNav.js'

function AdminHeader({ onLogout }) {
    const { pathname } = useLocation()

    return (
        <header className="admin-header">
            <div className="admin-header-container">
                <div>
                    <p className="admin-header-crumb">Admin</p>
                    <h1 className="admin-header-title">{getAdminPageTitle(pathname)}</h1>
                </div>
                <div className="admin-header-user">
                    <span className="admin-header-avatar" aria-hidden="true">A</span>
                    <div className="admin-header-user-text">
                        <strong>Administrator</strong>
                        <span>System Admin</span>
                    </div>
                    <button type="button" onClick={onLogout}>Log out</button>
                </div>
            </div>
        </header>
    )
}

export default AdminHeader
