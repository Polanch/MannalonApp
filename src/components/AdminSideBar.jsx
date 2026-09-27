import { useState } from 'react'
import menu from '../assets/images/menu.png'
import placeholder from '../assets/images/placeholder.png'
import { useNavigate } from 'react-router-dom'
function AdminSideBar() {
    const [collapsed, setCollapsed] = useState(true);
    const [usersExpanded, setUsersExpanded] = useState(false);
    const navigate = useNavigate();

    return (
        <div className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
            <div className="sidebar-header">
                <button onClick={() => setCollapsed(!collapsed)}><img src={menu} alt="Menu" /></button>
                <h1>Admin Panel</h1>
                <p>Welcome, Admin</p>
            </div>
            <ul className="sidebar-menu">
                <li><button className="sidebar-btn"><img src={placeholder} alt="Logo" className="sidebar-icn" /><span className="sidebar-text">Dashboard</span></button></li>
                <li className={usersExpanded ? 'sidebar-group expanded' : 'sidebar-group'}>
                    <button className="sidebar-btn" onClick={() => setUsersExpanded(!usersExpanded)} aria-expanded={usersExpanded}>
                        <img src={placeholder} alt="" className="sidebar-icn" />
                        <span className="sidebar-text">Users</span>
                    </button>
                    {usersExpanded && (
                        <ul className="sidebar-submenu">
                            <li><button className="sidebar-btn" onClick={() => navigate('/admin/farm-owners')}><img src={placeholder} alt="" className="sidebar-icn" /><span className="sidebar-text">Farm Owners</span></button></li>
                            <li><button className="sidebar-btn"><img src={placeholder} alt="" className="sidebar-icn" /><span className="sidebar-text">Farmers</span></button></li>
                        </ul>
                    )}
                </li>
                <li><button className="sidebar-btn" onClick={() => navigate('/admin/farm-management')}><img src={placeholder} alt="Logo" className="sidebar-icn" /><span className="sidebar-text">Farm Management</span></button>
                    {/* <ul className="submenu">
                        <li><button className="sidebar-btn"><span className="sidebar-text">Pending</span></button></li>
                        <li><button className="sidebar-btn"><span className="sidebar-text">Approved</span></button></li>
                        <li><button className="sidebar-btn"><span className="sidebar-text">Rejected</span></button></li>
                    </ul> */}
                </li>
                <li><button className="sidebar-btn"><img src={placeholder} alt="Logo" className="sidebar-icn" /><span className="sidebar-text">Settings</span></button></li>
            </ul>
        </div>
    );
}

export default AdminSideBar;