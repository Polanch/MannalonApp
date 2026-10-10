import FarmerDashboardLeftNavigation from './farmer_components/FarmerDashboardLeftNavigation.jsx'
import FarmerDashboardMiddleNavigation from './farmer_components/FarmerDashboardMiddleNavigation.jsx'
import FarmerDashboardRightNavigation from './farmer_components/FarmerDashboardRightNavigation.jsx'

function FarmerDashboard() {
    return (
        <div className="farmer-dashboard">
            <FarmerDashboardLeftNavigation/>
            <FarmerDashboardMiddleNavigation/>
            <FarmerDashboardRightNavigation/>
        </div>
    );
}

export default FarmerDashboard;