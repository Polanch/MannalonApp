import FarmerDashboardLeftNavigation from './farmer_components/FarmerDashboardLeftNavigation.jsx'
import FarmerDashboardMiddleNavigation from './farmer_components/FarmerDashboardMiddleNavigation.jsx'
import FarmerDashboardRightNavigation from './farmer_components/FarmerDashboardRightNavigation.jsx'

function FarmerDashboard({ session }) {
    return (
        <div className="farmer-dashboard">
            <FarmerDashboardLeftNavigation/>
            <FarmerDashboardMiddleNavigation session={session}/>
            <FarmerDashboardRightNavigation session={session}/>
        </div>
    );
}

export default FarmerDashboard;