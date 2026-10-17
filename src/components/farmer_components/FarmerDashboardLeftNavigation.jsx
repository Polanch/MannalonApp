import placeholderImage from '../../assets/images/placeholder.png';
import { useNavigate } from 'react-router-dom';

const primaryMenuItems = [{ label: 'Home', path: '/farmer' }, { label: 'Popular' }, { label: 'News' }, { label: 'Explore' }];

const menuSections = [
    {
        title: 'FarmTools',
        items: [
            { label: 'Chatbot' },
            { label: 'Saved' },
            { label: 'Weather', path: '/farmer/weather' },
            { label: 'Calculator' },
            { label: 'Library' },
            { label: 'Maps', path: '/farmer/maps' },
            { label: 'Rental', path: '/farmer/rentals' },
        ],
    },
    {
        title: 'Community',
        items: [{ label: 'Programs', path: '/farmer/community' }, { label: 'FarmTE', path: '/farmer/farmte' }, { label: 'Market Prices', path: '/farmer/market' }],
    },
    {
        title: 'Resources',
        items: [
            'About Mannalon',
            'Advertise',
            'Help',
            'Mannalon Rules',
            'Privacy Policy',
            'User Agreement',
            'Accessibility',
        ].map((label) => ({ label })),
    },
];

function FarmerDashboardLeftNavigation() {
    const navigate = useNavigate();

    return (
        <aside className="farmer-dashboard-left-navigation">
            <nav className="farmer-sidebar-menu" aria-label="Main navigation">
                <ul className="farmer-sidebar-list">
                    {primaryMenuItems.map((item) => (
                        <li key={item.label}>
                            <button className="farmer-sidebar-button" type="button" onClick={() => item.path && navigate(item.path)}>
                                <img src={placeholderImage} alt="" />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                {menuSections.map((section) => (
                    <section className="farmer-sidebar-section" key={section.title}>
                        <h2>{section.title}</h2>
                        <ul className="farmer-sidebar-list">
                            {section.items.map((item) => (
                                <li key={item.label}>
                                    <button className="farmer-sidebar-button" type="button" onClick={() => item.path && navigate(item.path)}>
                                        <img src={placeholderImage} alt="" />
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </nav>
            <p className="farmer-sidebar-copyright">
                © Mannalon App 2026, all rights reserved.
            </p>
        </aside>
    );
}

export default FarmerDashboardLeftNavigation;