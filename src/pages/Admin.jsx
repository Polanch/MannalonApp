import { useState } from 'react'
import AdminHeader from '../components/AdminHeader.jsx'
import '../assets/styles/admin.css'
import AdminSideBar from '../components/AdminSideBar.jsx'
import Login from '../components/AdminLogin.jsx'
import AdminFarmOwners from '../components/AdminFarmOwners.jsx'
import AdminFarmOwnerDetail from '../components/AdminFarmOwnerDetail.jsx'
import AdminFarmManagement from '../components/AdminFarmManagement.jsx'
import AdminFarmDetail from '../components/AdminFarmDetail.jsx'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('adminAuthenticated') === 'true')
    const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false)
    const { registrationId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    function handleLogin() {
        sessionStorage.setItem('adminAuthenticated', 'true')
        setIsAuthenticated(true)
    }

    function handleLogout() {
        sessionStorage.removeItem('adminAuthenticated')
        setIsAuthenticated(false)
        navigate('/admin')
    }

    function confirmLogout() {
        setIsLogoutConfirmationOpen(false)
        handleLogout()
    }

    function renderAdminSection() {
        if (location.pathname === '/admin/farm-owners') {
            return <AdminFarmOwners />
        }

        if (location.pathname === '/admin/farm-management') {
            return <AdminFarmManagement />
        }

        if (location.pathname.startsWith('/admin/farm-management/')) {
            return <AdminFarmDetail registrationId={registrationId} />
        }

        if (!registrationId) {
            return <div className="admin-empty-state">Select a section from the sidebar.</div>
        }

        return <AdminFarmOwnerDetail registrationId={registrationId} />
    }

    return isAuthenticated ? (
        <div className="admin-app-shell">
            <AdminHeader onLogout={() => setIsLogoutConfirmationOpen(true)} />
            <AdminSideBar />
            <main className="admin-main-content">
                {renderAdminSection()}
            </main>
            {isLogoutConfirmationOpen && (
                <div className="admin-confirm-backdrop" role="presentation">
                    <section className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-logout-title">
                        <p className="admin-eyebrow">SESSION</p>
                        <h2 id="admin-logout-title">Log out of Admin?</h2>
                        <p>You will be returned to the Admin login page.</p>
                        <div className="admin-confirm-actions">
                            <button className="admin-confirm-cancel" type="button" onClick={() => setIsLogoutConfirmationOpen(false)}>Cancel</button>
                            <button className="admin-confirm-logout" type="button" onClick={confirmLogout}>Log out</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    ) : (
        <Login onLogin={handleLogin} />
    )
}

export default Admin;