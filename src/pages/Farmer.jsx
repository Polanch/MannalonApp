import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import FarmerProfile from '../components/FarmerProfile.jsx'
import '../assets/styles/farmer.css'
import FarmerHeader from '../components/FarmerHeader.jsx'
import FarmerDashboard from '../components/FarmerDashboard.jsx'
import { clearFarmerSession, getFarmerSession, saveFarmerSession } from '../services/farmerApi.js'
function Farmer() {
    const navigate = useNavigate()
    const location = useLocation()
    const [session, setSession] = useState(() => getFarmerSession())

    if (!session) {
        return <Navigate to="/" replace />
    }

    function handleSessionUpdate(changes) {
        const updated = { ...session, ...changes }
        saveFarmerSession(updated)
        setSession(updated)
    }

    function handleLogout() {
        clearFarmerSession()
        navigate('/', { replace: true })
    }

    return (
      <div className="farmer-page">
      <FarmerHeader session={session} onLogout={handleLogout}/>
      {location.pathname.startsWith('/farmer/profile')
        ? <FarmerProfile session={session} onSessionUpdate={handleSessionUpdate}/>
        : <FarmerDashboard session={session}/>}
      </div>
    );
}

export default Farmer;