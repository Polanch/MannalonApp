import FarmerDashboardLeftNavigation from './farmer_components/FarmerDashboardLeftNavigation.jsx'
import FarmerDashboardMiddleNavigation from './farmer_components/FarmerDashboardMiddleNavigation.jsx'
import FarmerDashboardRightNavigation from './farmer_components/FarmerDashboardRightNavigation.jsx'
import FarmerPrograms from './farmer_components/FarmerPrograms.jsx'
import FarmTE from './farmer_components/FarmTE.jsx'
import FarmerMarket from './farmer_components/FarmerMarket.jsx'
import WeatherDashboard from './WeatherDashboard.jsx'
import PublicFarmMap from './PublicFarmMap.jsx'
import RentalMarketplace from './RentalMarketplace.jsx'
import FarmerChatbot from './farmer_components/FarmerChatbot.jsx'
import BookLibrary from './BookLibrary.jsx'
import TicketingPage from './TicketingPage.jsx'
import { useNavigate, useParams } from 'react-router-dom'

function FarmerDashboard({ session, view = 'home' }) {
    const navigate = useNavigate()
    const { ticketId } = useParams()
    return (
        <div className="farmer-dashboard">
            <FarmerDashboardLeftNavigation/>
            {view === 'community' ? <FarmerPrograms session={session}/>
                : view === 'farmte' ? <FarmTE session={session}/>
                : view === 'market' ? <FarmerMarket/>
                : view === 'weather' ? <WeatherDashboard session={session}/>
                : view === 'maps' ? <PublicFarmMap/>
                : view === 'rentals' ? <RentalMarketplace onOpenTicket={(id) => navigate(`/farmer/tickets/${id}`)}/>
                : view === 'chatbot' ? <FarmerChatbot/>
                : view === 'library' ? <BookLibrary/>
                : view === 'tickets' ? <TicketingPage key={ticketId || 'list'} initialTicketId={ticketId ? Number(ticketId) : null}/>
                : <FarmerDashboardMiddleNavigation session={session}/>}
            <FarmerDashboardRightNavigation session={session}/>
        </div>
    );
}

export default FarmerDashboard;
