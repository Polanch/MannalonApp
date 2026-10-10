import mannalonlogo from '../assets/images/MannalonLogo3.png'
import search from '../assets/images/search.png'
import mIcon1 from '../assets/images/m-icon1.png'
import mIcon2 from '../assets/images/m-icon2.png'
import mIcon3 from '../assets/images/m-icon3.png'
import mIcon4 from '../assets/images/m-icon4.png'
import placeholder from '../assets/images/placeholder.png'
function FarmerHeader({ session, onLogout }) {
    return (
        <div className="farmer-header">
            <div className="logo-holder">
                <img src={mannalonlogo} className="logo" alt="Mannalon Logo" />
            </div>
            <div className="search">
                <input type="search" name="" id="" className="search-bar" placeholder="Search" />
                <button className="search-button">
                    <img src={search} className="search-icon" alt="Search" />
                </button>
            </div>
            <div className="menu-holder">
                <div className="profile-holder">
                    <span className="pfp-holder">
                        <img src={placeholder} className="pfp" alt="Profile Placeholder" />
                    </span>
                    <a href="http://">{session?.firstName || session?.fullName}</a>
                    <a href="http://">Home</a>
                    <a href="http://">FarmTE</a>
                    <a
                        href="#"
                        onClick={(event) => {
                            event.preventDefault()
                            onLogout?.()
                        }}
                    >
                        Logout
                    </a>
                </div>
                <button>
                    <img src={mIcon1} className="menu-icon1" alt="Menu Icon" />
                </button>
                <button>
                    <img src={mIcon2} className="menu-icon2" alt="Menu Icon" />
                </button>
                <button>
                    <img src={mIcon3} className="menu-icon3" alt="Menu Icon" />
                </button>
                <button>
                    <img src={mIcon4} className="menu-icon4" alt="Menu Icon" />
                </button>
            </div>
        </div>
    );
}

export default FarmerHeader;