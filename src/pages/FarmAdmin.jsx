import { useState } from 'react'
import '../assets/styles/farmadmin.css'
import FarmAdminHeader from '../components/FarmAdminHeader';
import FarmAdminDashboard from '../components/FarmAdminDashboard';
import FarmAdminLand from '../components/FarmAdminLand';
import FarmAdminFarmers from '../components/FarmAdminFarmers.jsx';
import LandingPage from './LandingPage.jsx'
import { useNavigate } from 'react-router-dom'

const FARM_ADMIN_VIEW_KEY = 'farmAdminActiveView'

function FarmAdmin() {
    const navigate = useNavigate()
    const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('farmAdminAuthenticated') === 'true')
    const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false)
    const [activeView, setActiveView] = useState(() => {
        const savedView = sessionStorage.getItem(FARM_ADMIN_VIEW_KEY)
        return ['land', 'farmers'].includes(savedView) ? savedView : 'dashboard'
    })

    function selectView(view) {
        sessionStorage.setItem(FARM_ADMIN_VIEW_KEY, view)
        setActiveView(view)
    }

    function handleLoginSuccess() {
        sessionStorage.setItem('farmAdminAuthenticated', 'true')
        setIsAuthenticated(true)
    }

    function handleLogout() {
        sessionStorage.removeItem('farmAdminAuthenticated')
        sessionStorage.removeItem('farmAdminUserId')
        sessionStorage.removeItem(FARM_ADMIN_VIEW_KEY)
        setIsAuthenticated(false)
        navigate('/')
    }

    function confirmLogout() {
        setIsLogoutConfirmationOpen(false)
        handleLogout()
    }

    if (!isAuthenticated) {
        return (
            <LandingPage
                initialAdminPortalOpen
                onAdminLoginSuccess={handleLoginSuccess}
                onAdminPortalClose={handleLogout}
            />
        )
    }

    return (
        <div className="farm-admin-container">
            <FarmAdminHeader
                onHomeClick={() => selectView('dashboard')}
                onLandClick={() => selectView('land')}
                onFarmersClick={() => selectView('farmers')}
                onLogout={() => setIsLogoutConfirmationOpen(true)}
            />
            {activeView === 'land' ? (
                <FarmAdminLand />
            ) : activeView === 'farmers' ? (
                <FarmAdminFarmers />
            ) : (
                <FarmAdminDashboard />
            )}
            {isLogoutConfirmationOpen && (
                <div className="farm-admin-confirm-backdrop" role="presentation">
                    <section className="farm-admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="farm-admin-logout-title">
                        <p className="farm-admin-eyebrow">SESSION</p>
                        <h2 id="farm-admin-logout-title">Log out of Farm Admin?</h2>
                        <p>You will be returned to the MannalonApp home page.</p>
                        <div className="farm-admin-confirm-actions">
                            <button className="farm-admin-secondary-button" type="button" onClick={() => setIsLogoutConfirmationOpen(false)}>Cancel</button>
                            <button className="farm-admin-primary-button" type="button" onClick={confirmLogout}>Log out</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

export default FarmAdmin;