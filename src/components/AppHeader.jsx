import '../assets/styles/header.css'
import searchIcon from '../assets/images/search.png'
import SocialHeaderActions from './social/SocialHeaderActions.jsx'
import { resolveMediaUrl } from '../services/farmerApi.js'
import { initialsOf } from '../services/socialApi.js'

function AppHeader({ logo, logoAlt = 'MannalonApp', fixed = false, profileName, profilePictureUrl, isProfileActive = false, onProfileClick, onSearch, searchQuery = '', children }) {
    const pictureUrl = resolveMediaUrl(profilePictureUrl)

    return (
        <header className={`app-header${fixed ? ' is-fixed' : ''}`}>
            <div className="app-header-brand">
                <img src={logo} alt={logoAlt} className="app-header-logo" />
                <span className="app-header-title">MannalonApp</span>
            </div>
            <form key={searchQuery} className="app-header-search" role="search" onSubmit={(event) => {
                event.preventDefault()
                const query = new FormData(event.currentTarget).get('search').trim()
                if (onSearch) onSearch(query)
            }}>
                <input name="search" type="search" placeholder="Search MannalonApp" aria-label="Search" maxLength={200} defaultValue={searchQuery} />
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
