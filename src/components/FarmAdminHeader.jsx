import mao from '../assets/images/mao.png';
import AppHeader from './AppHeader.jsx';

const NAV_ITEMS = [
    { key: 'dashboard', label: 'Home', handler: 'onHomeClick' },
    { key: 'farmers', label: 'Farmers', handler: 'onFarmersClick' },
    { key: 'farmte', label: 'FarmTE', handler: 'onFarmTEClick' },
    { key: 'land', label: 'Land', handler: 'onLandClick' },
    { key: 'market', label: 'Market', handler: 'onMarketClick' },
    { key: 'community', label: 'Community', handler: 'onCommunityClick' },
];

function FarmAdminHeader({ activeView, onProfileClick, profileName, profilePictureUrl, ...handlers }) {
    return (
        <AppHeader
            fixed
            logo={mao}
            logoAlt="MAO logo"
            profileName={profileName}
            profilePictureUrl={profilePictureUrl}
            isProfileActive={activeView === 'profile'}
            onProfileClick={onProfileClick}
        >
            {NAV_ITEMS.map(({ key, label, handler }) => (handler ? (
                <button
                    key={key}
                    type="button"
                    className={`app-header-link${activeView === key ? ' is-active' : ''}`}
                    aria-current={activeView === key ? 'page' : undefined}
                    onClick={handlers[handler]}
                >
                    {label}
                </button>
            ) : (
                <button key={key} type="button" className="app-header-link" disabled title="Coming soon">
                    {label}
                </button>
            )))}
        </AppHeader>
    );
}

export default FarmAdminHeader;
