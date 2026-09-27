import { useState } from 'react';
import logo from '../assets/images/MannalonLogo.png';
import menuIcon from '../assets/images/menu.png';

function LandingHeader({ onAdminPortal }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    function closeMenu() {
        setIsMenuOpen(false)
    }

    function openAdminPortal() {
        closeMenu()
        onAdminPortal()
    }

    return (
        <header className="top-nav">
            <div className="landing-logo-holder">
                <img src={logo} alt="Logo" className="l-logo"/>
            </div>
            <div className="landing-menu-holder">
                <ul className="landing-menu">
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>Home</button></li>
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>About</button></li>
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>Services</button></li>
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>Contact</button></li>
                </ul>
            </div>
            <div className="landing-button-holder">
                <button type="button" className="portal-btn" onClick={openAdminPortal}>Admin Portal</button>
                <button className="download-btn">Download the App</button>
            </div>
            <button
                type="button"
                className="mobile-menu-toggle"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                aria-controls="landing-mobile-menu"
                onClick={() => setIsMenuOpen((open) => !open)}
            >
                <img src={menuIcon} alt="" />
            </button>
            <div id="landing-mobile-menu" className={`landing-mobile-dropdown${isMenuOpen ? ' is-open' : ''}`}>
                <ul className="landing-menu">
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>Home</button></li>
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>About</button></li>
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>Services</button></li>
                    <li><button type="button" className="menu-btn" onClick={closeMenu}>Contact</button></li>
                </ul>
                <div className="landing-button-holder">
                    <button type="button" className="portal-btn" onClick={openAdminPortal}>Admin Portal</button>
                    <button type="button" className="download-btn" onClick={closeMenu}>Download the App</button>
                </div>
            </div>
        </header>
    );
}

export default LandingHeader;