import { useCallback, useEffect, useState } from 'react';
import FarmerAnnouncements from './FarmerAnnouncements.jsx';
import SocialAvatar from '../social/SocialAvatar.jsx';
import GroupAvatar from '../social/GroupAvatar.jsx';
import CreateGroupModal from '../social/CreateGroupModal.jsx';
import { asList, fetchConversations, fetchFarmCircle, fetchFriends } from '../../services/socialApi.js';
import { useSocial } from '../../services/socialContext.js';

function PeopleList({ people, emptyText, onSelect }) {
    if (!people.length) return <p className="farmer-sidebar-empty">{emptyText}</p>;

    return (
        <ul className="farmer-sidebar-list">
            {people.map((person) => (
                <li key={person.userId}>
                    <button className="farmer-sidebar-button" type="button" onClick={() => onSelect(person)}>
                        <SocialAvatar user={person} size={28} />
                        <span className="farmer-sidebar-label">{person.fullName}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

function FarmerDashboardRightNavigation({ session }) {
    const { openChat, openGroupChat, groupsVersion, refreshGroups } = useSocial();
    const [friends, setFriends] = useState([]);
    const [farmCircle, setFarmCircle] = useState(null);
    const [groups, setGroups] = useState([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const userId = session?.userId;

    const loadGroups = useCallback(() => {
        if (!userId) return;
        fetchConversations({ userId })
            .then((data) => {
                setGroups(asList(data).filter((conversation) => conversation.type === 'GROUP'));
            })
            .catch(() => {
                // The sidebar is best-effort; keep whatever was loaded before.
            });
    }, [userId]);

    useEffect(() => {
        if (!userId) return undefined;
        let isActive = true;

        fetchFriends({ userId })
            .then((data) => {
                if (isActive) setFriends(asList(data));
            })
            .catch(() => {});

        fetchFarmCircle({ userId })
            .then((data) => {
                if (isActive) setFarmCircle(data);
            })
            .catch(() => {});

        return () => {
            isActive = false;
        };
    }, [userId]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups, groupsVersion]);

    function handleGroupCreated(conversation) {
        setIsCreateOpen(false);
        refreshGroups();
        openGroupChat(conversation);
    }

    return (
        <aside className="farmer-dashboard-right-navigation">
            <div className="farmer-right-content">
                <section className="farmer-sidebar-section farmer-right-first-section">
                    <h2>Announcements</h2>
                    <FarmerAnnouncements session={session} />
                </section>

                <section className="farmer-sidebar-section">
                    <h2>Friends</h2>
                    <PeopleList
                        people={friends}
                        emptyText="You have not added any friends yet."
                        onSelect={(person) => openChat(person)}
                    />
                </section>

                <section className="farmer-sidebar-section">
                    <h2>My Farm</h2>
                    {farmCircle?.farmName && (
                        <p className="farmer-sidebar-subtitle">
                            {farmCircle.farmName}
                            {farmCircle.farmCode ? ` · ${farmCircle.farmCode}` : ''}
                        </p>
                    )}
                    <PeopleList
                        people={farmCircle?.members || []}
                        emptyText="No other members are registered under your farm yet."
                        onSelect={(person) => openChat(person)}
                    />
                </section>

                <section className="farmer-sidebar-section">
                    <div className="farmer-sidebar-heading">
                        <h2>Group Chats</h2>
                        <button type="button" className="farmer-sidebar-action" onClick={() => setIsCreateOpen(true)}>+ New</button>
                    </div>
                    {groups.length ? (
                        <ul className="farmer-sidebar-list">
                            {groups.map((group) => (
                                <li key={group.conversationId}>
                                    <button className="farmer-sidebar-button" type="button" onClick={() => openGroupChat(group)}>
                                        <GroupAvatar group={group} viewerId={userId} size={28} />
                                        <span className="farmer-sidebar-label">{group.title || 'Group chat'}</span>
                                        {group.unreadCount > 0 && <em className="farmer-sidebar-badge">{group.unreadCount}</em>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="farmer-sidebar-empty">Create a group chat with your friends or farm members.</p>
                    )}
                </section>
            </div>

            <footer className="farmer-sidebar-copyright">
                <p>Mannalon Rules</p>
                <p>Privacy Policy User Agreement</p>
                <p>Accessibility</p>
                <p>© MannalonApp 2026. All rights reserved.</p>
            </footer>

            {isCreateOpen && (
                <CreateGroupModal
                    session={session}
                    onClose={() => setIsCreateOpen(false)}
                    onCreated={handleGroupCreated}
                />
            )}
        </aside>
    );
}

export default FarmerDashboardRightNavigation;