import { useCallback, useMemo, useState } from 'react'
import '../assets/styles/farmadmin.css'
import FarmAdminHeader from '../components/FarmAdminHeader';
import FarmAdminDashboard from '../components/FarmAdminDashboard';
import FarmAdminShell from '../components/FarmAdminShell.jsx';
import FarmAdminLand from '../components/FarmAdminLand';
import FarmAdminFarmers from '../components/FarmAdminFarmers.jsx';
import FarmAdminFarmTE from '../components/FarmAdminFarmTE.jsx';
import FarmAdminRoles from '../components/FarmAdminRoles.jsx';
import FarmAdminProfile from '../components/FarmAdminProfile.jsx';
import FarmAdminWeather from '../components/FarmAdminWeather.jsx';
import RentalMarketplace from '../components/RentalMarketplace.jsx';
import BookLibrary from '../components/BookLibrary.jsx';
import FarmerMarket from '../components/farmer_components/FarmerMarket.jsx'
import FarmerPrograms from '../components/farmer_components/FarmerPrograms.jsx'
import FarmAdminLeftNavigation from '../components/farmadmin_components/FarmAdminLeftNavigation.jsx'
import SocialProvider from '../components/social/SocialProvider.jsx'
import UserProfileView from '../components/social/UserProfileView.jsx'
import LandingPage from './LandingPage.jsx'
import { useNavigate } from 'react-router-dom'
import { accountError, logoutAccount } from '../services/userManagementApi.js'
import { clearLocalAccount } from '../services/accountAccess.js'

const FARM_ADMIN_VIEW_KEY = 'farmAdminActiveView'
const FARM_ADMIN_VIEWED_USER_KEY = 'farmAdminViewedUserId'

function FarmAdmin() {
    const navigate = useNavigate()
    const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('farmAdminAuthenticated') === 'true')
    const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false)
    const [logoutError, setLogoutError] = useState('')
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [viewedUserId, setViewedUserId] = useState(() => sessionStorage.getItem(FARM_ADMIN_VIEWED_USER_KEY) || '')
    const [activeView, setActiveView] = useState(() => {
        const savedView = sessionStorage.getItem(FARM_ADMIN_VIEW_KEY)
        if (savedView === 'user' && sessionStorage.getItem(FARM_ADMIN_VIEWED_USER_KEY)) return 'user'
        return ['land', 'farmers', 'roles', 'farmte', 'profile', 'market', 'community', 'weather', 'rentals', 'library'].includes(savedView) ? savedView : 'dashboard'
    })
    const [profileName, setProfileName] = useState(() => sessionStorage.getItem('farmAdminName') || '')
    const [profilePictureUrl, setProfilePictureUrl] = useState(() => sessionStorage.getItem('farmAdminProfilePictureUrl') || '')

    const socialSession = useMemo(() => (isAuthenticated
        ? { userId: sessionStorage.getItem('farmAdminUserId') || '', fullName: profileName, profilePictureUrl }
        : null), [isAuthenticated, profileName, profilePictureUrl])

    const selectView = useCallback((view) => {
        sessionStorage.setItem(FARM_ADMIN_VIEW_KEY, view)
        setActiveView(view)
    }, [])

    const openUserProfile = useCallback((userId) => {
        sessionStorage.setItem(FARM_ADMIN_VIEWED_USER_KEY, userId)
        setViewedUserId(userId)
        selectView('user')
    }, [selectView])

    const openOwnProfile = useCallback(() => selectView('profile'), [selectView])
    const requestLogout = useCallback(() => setIsLogoutConfirmationOpen(true), [])

    function handleProfileUpdated(profile) {
        const name = profile.fullName || profileName
        const pictureUrl = profile.profilePictureUrl || ''
        sessionStorage.setItem('farmAdminName', name)
        sessionStorage.setItem('farmAdminProfilePictureUrl', pictureUrl)
        setProfileName(name)
        setProfilePictureUrl(pictureUrl)
    }

    function handleLoginSuccess() {
        sessionStorage.setItem('farmAdminAuthenticated', 'true')
        setProfileName(sessionStorage.getItem('farmAdminName') || '')
        setProfilePictureUrl(sessionStorage.getItem('farmAdminProfilePictureUrl') || '')
        setIsAuthenticated(true)
    }

    function handleLogout() {
        clearLocalAccount()
        setIsAuthenticated(false)
        navigate('/')
    }

    async function confirmLogout() {
        setIsLoggingOut(true)
        setLogoutError('')
        try {
            await logoutAccount()
            setIsLogoutConfirmationOpen(false)
            handleLogout()
        } catch (error) {
            setLogoutError(accountError(error))
        } finally {
            setIsLoggingOut(false)
        }
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
        <SocialProvider session={socialSession} onOpenProfile={openUserProfile} onOpenOwnProfile={openOwnProfile} onLogout={requestLogout}>
        <div className={`farm-admin-container${activeView === 'library' ? ' farm-admin-library' : ''}`}>
            <FarmAdminHeader
                activeView={activeView}
                onHomeClick={() => selectView('dashboard')}
                onLandClick={() => selectView('land')}
                onFarmersClick={() => selectView('farmers')}
                onRolesClick={() => selectView('roles')}
                onFarmTEClick={() => selectView('farmte')}
                onMarketClick={() => selectView('market')}
                onCommunityClick={() => selectView('community')}
                onProfileClick={() => selectView('profile')}
                profileName={profileName}
                profilePictureUrl={profilePictureUrl}
            />
            {activeView === 'user' && viewedUserId ? (
                <div className="farm-admin-home">
                    <UserProfileView targetUserId={viewedUserId} leftNavigation={<FarmAdminLeftNavigation onNavigate={selectView} />} />
                </div>
            ) : (
                <FarmAdminShell onNavigate={selectView} isFeed={activeView === 'dashboard'}>
                    {activeView === 'profile' ? (
                        <FarmAdminProfile onProfileUpdated={handleProfileUpdated} />
                    ) : activeView === 'land' ? (
                        <FarmAdminLand />
                    ) : activeView === 'farmers' ? (
                        <FarmAdminFarmers />
                    ) : activeView === 'farmte' ? (
                        <FarmAdminFarmTE />
                    ) : activeView === 'roles' ? (
                        <FarmAdminRoles />
                    ) : activeView === 'market' ? (
                        <FarmerMarket cardView />
                    ) : activeView === 'community' ? (
                        <FarmerPrograms session={socialSession} readOnly />
                    ) : activeView === 'weather' ? (
                        <FarmAdminWeather />
                    ) : activeView === 'rentals' ? (
                        <RentalMarketplace />
                    ) : activeView === 'library' ? (
                        <BookLibrary />
                    ) : (
                        <FarmAdminDashboard />
                    )}
                </FarmAdminShell>
            )}
            {isLogoutConfirmationOpen && (
                <div className="farm-admin-confirm-backdrop" role="presentation">
                    <section className="farm-admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="farm-admin-logout-title">
                        <p className="farm-admin-eyebrow">SESSION</p>
                        <h2 id="farm-admin-logout-title">Log out of Farm Admin?</h2>
                        <p>You will be returned to the MannalonApp home page.</p>
                        {logoutError && <p role="alert">{logoutError}</p>}
                        <div className="farm-admin-confirm-actions">
                            <button className="farm-admin-secondary-button" type="button" disabled={isLoggingOut} onClick={() => setIsLogoutConfirmationOpen(false)}>Cancel</button>
                            <button className="farm-admin-primary-button" type="button" disabled={isLoggingOut} onClick={confirmLogout}>Log out</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
        </SocialProvider>
    );
}

export default FarmAdmin;