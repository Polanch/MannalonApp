import { Navigate, useNavigate } from 'react-router-dom'
import '../assets/styles/farmer.css'
import FarmerHeader from '../components/FarmerHeader.jsx'
import FarmerDashboard from '../components/FarmerDashboard.jsx'
import { clearFarmerSession, getFarmerSession } from '../services/farmerApi.js'
function Farmer() {
    const navigate = useNavigate()
    const session = getFarmerSession()

    if (!session) {
        return <Navigate to="/" replace />
    }

    function handleLogout() {
        clearFarmerSession()
        navigate('/', { replace: true })
    }

    return (
      <div className="farmer-page">
      <FarmerHeader session={session} onLogout={handleLogout}/>
      <FarmerDashboard session={session}/>
      </div>
    );
}

export default Farmer;