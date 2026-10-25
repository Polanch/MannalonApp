import { useState } from 'react'
import AdminHeader from '../components/AdminHeader.jsx'
import '../assets/styles/admin.css'
import AdminSideBar from '../components/AdminSideBar.jsx'
import Login from '../components/AdminLogin.jsx'
import AdminFarmOwners from '../components/AdminFarmOwners.jsx'
import AdminFarmOwnerDetail from '../components/AdminFarmOwnerDetail.jsx'
import AdminFarmers from '../components/AdminFarmers.jsx'
import AdminPrograms from '../components/AdminPrograms.jsx'
import AdminMarket from '../components/AdminMarket.jsx'
import AdminDashboard from '../components/AdminDashboard.jsx'
import AdminFarmManagement from '../components/AdminFarmManagement.jsx'
import AdminFarmDetail from '../components/AdminFarmDetail.jsx'
import RentalMarketplace from '../components/RentalMarketplace.jsx'
import BookLibrary from '../components/BookLibrary.jsx'
import AdminUserManagement from '../components/AdminUserManagement.jsx'
import AdminChatbotRecords from '../components/AdminChatbotRecords.jsx'
import { accountError, logoutAccount } from '../services/userManagementApi.js'
import { clearLocalAccount } from '../services/accountAccess.js'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('adminAuthenticated') === 'true')
    const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false)
    const [logoutError, setLogoutError] = useState('')
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const { registrationId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    function handleLogin() {
        sessionStorage.setItem('adminAuthenticated', 'true')
        setIsAuthenticated(true)
    }

    async function confirmLogout() {
        setLogoutError('')
        setIsLoggingOut(true)
        try {
            await logoutAccount()
            clearLocalAccount()
            setIsLogoutConfirmationOpen(false)
            setIsAuthenticated(false)
            navigate('/admin')
        } catch (error) {
            setLogoutError(accountError(error))
        } finally {
            setIsLoggingOut(false)
        }
    }

    function renderAdminSection() {
        if (location.pathname === '/admin/chat-records') {
            return <AdminChatbotRecords />
        }
        if (location.pathname === '/admin/users') {
            return <AdminUserManagement />
        }
        if (location.pathname === '/admin/library') {
            return <BookLibrary adminMode />
        }
        if (location.pathname === '/admin/farm-owners') {
            return <AdminFarmOwners />
        }

        if (location.pathname === '/admin/programs') {
            return <AdminPrograms />
        }

        if (location.pathname === '/admin/market') {
            return <AdminMarket />
        }

        if (location.pathname === '/admin/rentals') {
            return <RentalMarketplace heading="MAO tool rental" adminMode />
        }

        if (location.pathname === '/admin/farmers') {
            return <AdminFarmers />
        }

        if (location.pathname === '/admin/farm-management') {
            return <AdminFarmManagement />
        }

        if (location.pathname.startsWith('/admin/farm-management/')) {
            return <AdminFarmDetail registrationId={registrationId} />
        }

        if (!registrationId) {
            return <AdminDashboard />
        }

        return <AdminFarmOwnerDetail registrationId={registrationId} />
    }

    return isAuthenticated ? (
        <div className={`admin-app-shell${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
            <AdminSideBar collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed((current) => !current)} />
            <AdminHeader onLogout={() => setIsLogoutConfirmationOpen(true)} />
            <main className={`admin-main-content${location.pathname === '/admin/users' ? ' admin-users-content' : ''}${location.pathname === '/admin/chat-records' ? ' admin-chat-records-content' : ''}`}>
                {renderAdminSection()}
            </main>
            {isLogoutConfirmationOpen && (
                <div className="admin-confirm-backdrop" role="presentation">
                    <section className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-logout-title">
                        <p className="admin-eyebrow">SESSION</p>
                        <h2 id="admin-logout-title">Log out of Admin?</h2>
                        <p>You will be returned to the Admin login page.</p>
                        {logoutError && <p role="alert">{logoutError}</p>}
                        <div className="admin-confirm-actions">
                            <button className="admin-confirm-cancel" type="button" disabled={isLoggingOut} onClick={() => setIsLogoutConfirmationOpen(false)}>Cancel</button>
                            <button className="admin-confirm-logout" type="button" disabled={isLoggingOut} onClick={confirmLogout}>Log out</button>
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
