import placeholderImage from '../../assets/images/placeholder.png';

const primaryMenuItems = ['Home', 'Popular', 'News', 'Explore'];

const menuSections = [
    {
        title: 'FarmTools',
        items: ['Chatbot', 'Saved', 'Weather', 'Calculator', 'Library', 'Maps'],
    },
    {
        title: 'Community',
        items: ['Farm Name', 'FarmTe'],
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
        ],
    },
];

function FarmerDashboardLeftNavigation() {
    return (
        <aside className="farmer-dashboard-left-navigation">
            <nav className="farmer-sidebar-menu" aria-label="Main navigation">
                <ul className="farmer-sidebar-list">
                    {primaryMenuItems.map((item) => (
                        <li key={item}>
                            <button className="farmer-sidebar-button" type="button">
                                <img src={placeholderImage} alt="" />
                                <span>{item}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                {menuSections.map((section) => (
                    <section className="farmer-sidebar-section" key={section.title}>
                        <h2>{section.title}</h2>
                        <ul className="farmer-sidebar-list">
                            {section.items.map((item) => (
                                <li key={item}>
                                    <button className="farmer-sidebar-button" type="button">
                                        <img src={placeholderImage} alt="" />
                                        <span>{item}</span>
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