import '../assets/styles/header.css'
import searchIcon from '../assets/images/search.png'
import SocialHeaderActions from './social/SocialHeaderActions.jsx'
import { resolveMediaUrl } from '../services/farmerApi.js'
import { initialsOf } from '../services/socialApi.js'

function AppHeader({ logo, logoAlt = 'MannalonApp', fixed = false, profileName, profilePictureUrl, isProfileActive = false, onProfileClick, children }) {
    const pictureUrl = resolveMediaUrl(profilePictureUrl)

    return (
        <header className={`app-header${fixed ? ' is-fixed' : ''}`}>
            <div className="app-header-brand">
                <img src={logo} alt={logoAlt} className="app-header-logo" />
                <span className="app-header-title">MannalonApp</span>
            </div>
            <form className="app-header-search" role="search" onSubmit={(event) => event.preventDefault()}>
                <input type="search" placeholder="Search MannalonApp" aria-label="Search" />
                <button type="submit" aria-label="Search">
                    <img src={searchIcon} alt="" />
                </button>
            </form>
            <nav className="app-header-nav" aria-label="Main">
                {children}
            </nav>
            <div className="app-header-right">
                <button
                    type="button"
                    className={`app-header-profile${isProfileActive ? ' is-active' : ''}`}
                    aria-current={isProfileActive ? 'page' : undefined}
                    onClick={onProfileClick}
                    title="My profile"
                >
                    <span className="app-header-avatar">
                        {pictureUrl ? <img src={pictureUrl} alt="" /> : initialsOf(profileName)}
                    </span>
                    <span className="app-header-profile-name">{profileName || 'Profile'}</span>
                </button>
                <SocialHeaderActions />
            </div>
        </header>
    )
}

export default AppHeader
