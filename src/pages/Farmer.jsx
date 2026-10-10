import '../assets/styles/farmer.css'
import FarmerHeader from '../components/FarmerHeader.jsx'
import FarmerDashboard from '../components/FarmerDashboard.jsx'
function Farmer() {
    return (
      <div className="farmer-page">
      <FarmerHeader/>
      <FarmerDashboard/>
      </div>
    );
}

export default Farmer;