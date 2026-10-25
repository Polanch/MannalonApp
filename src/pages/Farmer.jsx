import { useCallback, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import FarmerProfile from '../components/FarmerProfile.jsx'
import '../assets/styles/farmer.css'
import FarmerHeader from '../components/FarmerHeader.jsx'
import FarmerDashboard from '../components/FarmerDashboard.jsx'
import FarmerDashboardLeftNavigation from '../components/farmer_components/FarmerDashboardLeftNavigation.jsx'
import SocialProvider from '../components/social/SocialProvider.jsx'
import UserProfileView from '../components/social/UserProfileView.jsx'
import { getFarmerSession, saveFarmerSession } from '../services/farmerApi.js'
import { accountError, logoutAccount } from '../services/userManagementApi.js'
import { clearLocalAccount } from '../services/accountAccess.js'

const USER_PATH = '/farmer/user/'

function Farmer() {
    const navigate = useNavigate()
    const location = useLocation()
    const [session, setSession] = useState(() => getFarmerSession())
    const [logoutError, setLogoutError] = useState('')

    const openProfile = useCallback((userId) => navigate(`${USER_PATH}${encodeURIComponent(userId)}`), [navigate])
    const openOwnProfile = useCallback(() => navigate('/farmer/profile'), [navigate])
    const handleLogout = useCallback(async () => {
        try {
            await logoutAccount()
            clearLocalAccount()
            navigate('/', { replace: true })
        } catch (error) {
            setLogoutError(accountError(error))
        }
    }, [navigate])

    if (!session) {
        return <Navigate to="/" replace />
    }

    function handleSessionUpdate(changes) {
        const updated = { ...session, ...changes }
        saveFarmerSession(updated)
        setSession(updated)
    }

    const viewedUserId = location.pathname.startsWith(USER_PATH)
        ? decodeURIComponent(location.pathname.slice(USER_PATH.length))
        : ''

    return (
      <SocialProvider session={session} onOpenProfile={openProfile} onOpenOwnProfile={openOwnProfile} onLogout={handleLogout}>
      <div className={`farmer-page${location.pathname.startsWith('/farmer/chatbot') ? ' farmer-page-chatbot' : ''}${location.pathname.startsWith('/farmer/library') ? ' farmer-page-library' : ''}`}>
      <FarmerHeader session={session}/>
      {logoutError && <p className="um-error" role="alert">{logoutError}</p>}
      {viewedUserId
        ? <UserProfileView targetUserId={viewedUserId} leftNavigation={<FarmerDashboardLeftNavigation/>}/>
        : location.pathname.startsWith('/farmer/profile')
        ? <FarmerProfile session={session} onSessionUpdate={handleSessionUpdate}/>
        : location.pathname.startsWith('/farmer/weather')
        ? <FarmerDashboard session={session} view="weather"/>
        : <FarmerDashboard session={session} view={['community', 'farmte', 'market', 'maps', 'rentals', 'chatbot', 'library'].find((view) => location.pathname.startsWith(`/farmer/${view}`)) || 'home'}/>}
      </div>
      </SocialProvider>
    );
}

export default Farmer;