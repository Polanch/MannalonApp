import mao from '../assets/images/mao.png';
import placeholder from '../assets/images/placeholder.png';
function FarmAdminHeader({ onHomeClick, onLandClick, onLogout }) {
    return (
        <div className="farm-admin-header">
            <div className="farm-admin-logo">
                <img src={mao} alt="Mao Logo" className="farm-admin-logo-img"/>
                <h2>MannalonApp</h2>
                <input type="text" placeholder="Search..." className="farm-admin-search"/>
            </div>
            <ul className="farm-admin-menu">
                <li><button type="button" onClick={onHomeClick}><img src={placeholder} alt="Home" className="farm-admin-menu-img"/></button></li>
                <li><button><img src={placeholder} alt="Market" className="farm-admin-menu-img"/></button></li>
                <li><button type="button" onClick={onLandClick}><img src={placeholder} alt="Land" className="farm-admin-menu-img"/></button></li>
                <li><button><img src={placeholder} alt="Community" className="farm-admin-menu-img"/></button></li>
                <li><button type="button" onClick={onLogout}>Logout</button></li>
            </ul>
        </div>
    );
}

export default FarmAdminHeader;