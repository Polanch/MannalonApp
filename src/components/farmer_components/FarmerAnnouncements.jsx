import placeholderImage from '../../assets/images/placeholder.png';

const announcements = [
    {
        id: 1,
        author: 'Mannalon Admin',
        role: 'Admin',
        title: 'Scheduled system maintenance this weekend',
        date: '1 day ago',
    },
    {
        id: 2,
        author: 'Farm Admin',
        role: 'Farm Admin',
        title: 'Planting schedule for the coming season is out',
        date: '3 days ago',
    },
];

function FarmerAnnouncements() {
    return (
        <ul className="farmer-announcement-list">
            {announcements.map((announcement) => (
                <li className="farmer-announcement" key={announcement.id}>
                    <div className="farmer-announcement-author">
                        <img src={placeholderImage} alt="" />
                        <span>{announcement.author}</span>
                        <span className="farmer-announcement-role">{announcement.role}</span>
                    </div>
                    <p className="farmer-announcement-title">{announcement.title}</p>
                    <p className="farmer-announcement-date">{announcement.date}</p>
                </li>
            ))}
        </ul>
    );
}

export default FarmerAnnouncements;
