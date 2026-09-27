import logo from '../assets/images/MannalonLogo.png';
function LandingHeader({ onAdminPortal }) {
    return (
        <div className="top-nav">
            <div className="landing-logo-holder">
                <img src={logo} alt="Logo" className="l-logo"/>
            </div>
            <div className="landing-menu-holder">
                <ul className="landing-menu">
                    <li><button type="button" className="menu-btn">Home</button></li>
                    <li><button type="button" className="menu-btn">About</button></li>
                    <li><button type="button" className="menu-btn">Services</button></li>
                    <li><button type="button" className="menu-btn">Contact</button></li>
                </ul>
            </div>
            <div className="landing-button-holder">
                <button type="button" className="portal-btn" onClick={onAdminPortal}>Admin Portal</button>
                <button className="download-btn">Download the App</button>
            </div>
        </div>
    );
}

export default LandingHeader;