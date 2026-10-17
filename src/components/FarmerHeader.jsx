import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import mannalonlogo from '../assets/images/MannalonLogo3.png'
import AppHeader from './AppHeader.jsx'

const NAV_ITEMS = [
    { to: '/farmer', label: 'Home', end: true },
    { to: '/farmer/community', label: 'Community' },
    { to: '/farmer/farmte', label: 'FarmTE' },
    { to: '/farmer/market', label: 'Market' },
]

function FarmerHeader({ session }) {
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <AppHeader
            logo={mannalonlogo}
            profileName={session?.firstName || session?.fullName}
            profilePictureUrl={session?.profilePictureUrl}
            isProfileActive={location.pathname.startsWith('/farmer/profile')}
            onProfileClick={() => navigate('/farmer/profile')}
        >
            {NAV_ITEMS.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `app-header-link${isActive ? ' is-active' : ''}`}>
                    {label}
                </NavLink>
            ))}
        </AppHeader>
    )
}

export default FarmerHeader
