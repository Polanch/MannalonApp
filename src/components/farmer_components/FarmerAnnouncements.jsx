import { useEffect, useState } from 'react';
import placeholderImage from '../../assets/images/placeholder.png';
import { fetchFarmerAnnouncements, formatRelativeTime, resolveMediaUrl } from '../../services/farmerApi.js';

function FarmerAnnouncements({ session }) {
    const [announcements, setAnnouncements] = useState([]);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        let isActive = true;

        async function load() {
            try {
                const data = await fetchFarmerAnnouncements({ userId: session.userId });
                if (isActive) {
                    setAnnouncements(Array.isArray(data) ? data : []);
                    setStatus('done');
                }
            } catch {
                if (isActive) setStatus('error');
            }
        }

        load();
        return () => { isActive = false; };
    }, [session.userId]);

    if (status === 'loading') {
        return <p className="farmer-announcement-date">Loading...</p>;
    }
    if (status === 'error') {
        return <p className="farmer-announcement-date">Unable to load announcements.</p>;
    }
    if (announcements.length === 0) {
        return <p className="farmer-announcement-date">No announcements yet.</p>;
    }

    return (
        <ul className="farmer-announcement-list">
            {announcements.map((announcement) => (
                <li className="farmer-announcement" key={announcement.id}>
                    <div className="farmer-announcement-author">
                        <img src={placeholderImage} alt="" />
                        <span>{announcement.authorName || 'Farm Admin'}</span>
                        <span className="farmer-announcement-role">Farm Admin</span>
                    </div>
                    <p className="farmer-announcement-title">{announcement.title}</p>
                    {announcement.content && <p className="farmer-announcement-body">{announcement.content}</p>}
                    {announcement.imageUrl && (
                        <img
                            className="farmer-announcement-image"
                            src={resolveMediaUrl(announcement.imageUrl)}
                            alt=""
                        />
                    )}
                    <p className="farmer-announcement-date">{formatRelativeTime(announcement.createdAt)}</p>
                </li>
            ))}
        </ul>
    );
}

export default FarmerAnnouncements;
