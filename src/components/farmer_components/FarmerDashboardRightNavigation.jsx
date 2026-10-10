import placeholderImage from '../../assets/images/placeholder.png';
import FarmerAnnouncements from './FarmerAnnouncements.jsx';

const farmMembers = ['Kuya Mannalon', 'Maria Santos', 'Juan Dela Cruz', 'Ana Reyes'];

const groupChats = ['Farm General', 'Harvest Planning', 'Equipment Sharing'];

const recentPosts = [
    {
        id: 1,
        title: 'Best fertilizer for rice this season',
        description: 'Here are some tips on choosing the right fertilizer for your rice fields before the planting season begins and how to apply it.',
    },
    {
        id: 2,
        title: 'Dealing with pests in the wet season',
        description: 'Pests tend to multiply when it rains often, so here is a short guide on how to keep your crops safe without spending too much.',
    },
];

function shorten(text, maxLength = 60) {
    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}

function FarmerDashboardRightNavigation({ session }) {
    return (
        <aside className="farmer-dashboard-right-navigation">
            <div className="farmer-right-content">
                <section className="farmer-sidebar-section farmer-right-first-section">
                    <h2>Announcements</h2>
                    <FarmerAnnouncements session={session} />
                </section>

                <section className="farmer-sidebar-section">
                    <h2>My Farm</h2>
                    <ul className="farmer-sidebar-list">
                        {farmMembers.map((member) => (
                            <li key={member}>
                                <button className="farmer-sidebar-button" type="button">
                                    <img src={placeholderImage} alt="" />
                                    <span>{member}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="farmer-sidebar-section">
                    <h2>Group Chats</h2>
                    <ul className="farmer-sidebar-list">
                        {groupChats.map((chat) => (
                            <li key={chat}>
                                <button className="farmer-sidebar-button" type="button">
                                    <img src={placeholderImage} alt="" />
                                    <span>{chat}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="farmer-sidebar-section">
                    <h2>Recents</h2>
                    <ul className="farmer-sidebar-list">
                        {recentPosts.map((post) => (
                            <li key={post.id}>
                                <button className="farmer-recent-box" type="button">
                                    <img src={placeholderImage} alt="" />
                                    <span className="farmer-recent-text">
                                        <strong>{post.title}</strong>
                                        <span>{shorten(post.description)}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <footer className="farmer-sidebar-copyright">
                <p>Mannalon Rules</p>
                <p>Privacy Policy User Agreement</p>
                <p>Accessibility</p>
                <p>© MannalonApp 2026. All rights reserved.</p>
            </footer>
        </aside>
    );
}

export default FarmerDashboardRightNavigation;