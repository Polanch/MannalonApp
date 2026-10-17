import { useState } from 'react'
import FarmerDashboardMiddleNavigation from './farmer_components/FarmerDashboardMiddleNavigation.jsx'
import { getFarmAdminSession } from '../services/farmAdminApi.js'

function FarmAdminDashboard() {
    const [session] = useState(getFarmAdminSession)

    return <FarmerDashboardMiddleNavigation session={session} />
}

export default FarmAdminDashboard
