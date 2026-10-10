import placeholderImage from '../../assets/images/placeholder.png'

const SECTIONS = [
    {
        title: 'Farm Management',
        items: [
            { label: 'Farmers', view: 'farmers' },
            { label: 'Roles', view: 'roles' },
            { label: 'Land', view: 'land' },
        ],
    },
    {
        title: 'Farm Operations',
        items: [{ label: 'Crops' }, { label: 'Harvest Schedule' }, { label: 'Inventory' }, { label: 'Reports' }],
    },
    {
        title: 'Community',
        items: [{ label: 'Farm Feed', view: 'dashboard' }, { label: 'Group Chats' }, { label: 'Market' }],
    },
    {
        title: 'Resources',
        items: [{ label: 'Help' }, { label: 'Mannalon Rules' }, { label: 'Privacy Policy' }, { label: 'User Agreement' }],
    },
]

function FarmAdminLeftNavigation({ onNavigate }) {
    return (
        <aside className="farmer-dashboard-left-navigation">
            <nav className="farmer-sidebar-menu" aria-label="Farm admin navigation">
                <ul className="farmer-sidebar-list">
                    <li>
                        <button className="farmer-sidebar-button" type="button" onClick={() => onNavigate('dashboard')}>
                            <img src={placeholderImage} alt="" />
                            <span>Home</span>
                        </button>
                    </li>
                </ul>

                {SECTIONS.map((section) => (
                    <section className="farmer-sidebar-section" key={section.title}>
                        <h2>{section.title}</h2>
                        <ul className="farmer-sidebar-list">
                            {section.items.map(({ label, view }) => (
                                <li key={label}>
                                    <button
                                        className="farmer-sidebar-button"
                                        type="button"
                                        disabled={!view}
                                        title={view ? undefined : 'Coming soon'}
                                        onClick={view ? () => onNavigate(view) : undefined}
                                    >
                                        <img src={placeholderImage} alt="" />
                                        <span>{label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </nav>
            <p className="farmer-sidebar-copyright">© Mannalon App 2026, all rights reserved.</p>
        </aside>
    )
}

export default FarmAdminLeftNavigation
