import mao from '../assets/images/mao.png';

const NAV_ITEMS = [
    { key: 'dashboard', label: 'Home', handler: 'onHomeClick' },
    { key: 'farmers', label: 'Farmers', handler: 'onFarmersClick' },
    { key: 'roles', label: 'Roles', handler: 'onRolesClick' },
    { key: 'land', label: 'Land', handler: 'onLandClick' },
    { key: 'market', label: 'Market' },
    { key: 'community', label: 'Community' },
];

function FarmAdminHeader({ activeView, onLogout, ...handlers }) {
    return (
        <div className="farm-admin-header">
            <div className="farm-admin-logo">
                <img src={mao} alt="Mao Logo" className="farm-admin-logo-img"/>
                <h2>MannalonApp</h2>
                <input type="text" placeholder="Search..." className="farm-admin-search"/>
            </div>
            <ul className="farm-admin-menu">
                {NAV_ITEMS.map(({ key, label, handler }) => (
                    <li key={key}>
                        {handler ? (
                            <button
                                type="button"
                                className={`farm-admin-nav-link${activeView === key ? ' is-active' : ''}`}
                                aria-current={activeView === key ? 'page' : undefined}
                                onClick={handlers[handler]}
                            >
                                {label}
                            </button>
                        ) : (
                            <button type="button" className="farm-admin-nav-link" disabled title="Coming soon">
                                {label}
                            </button>
                        )}
                    </li>
                ))}
                <li>
                    <button type="button" className="farm-admin-nav-link farm-admin-nav-logout" onClick={onLogout}>Logout</button>
                </li>
            </ul>
        </div>
    );
}

export default FarmAdminHeader;
