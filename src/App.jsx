import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import Admin from './pages/Admin.jsx';
import FarmAdmin from './pages/FarmAdmin.jsx';
import Farmer from './pages/Farmer.jsx';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element ={<Admin/>}/>
        <Route path="/admin/farm-owners" element={<Admin />} />
        <Route path="/admin/farmers" element={<Admin />} />
        <Route path="/admin/programs" element={<Admin />} />
        <Route path="/admin/market" element={<Admin />} />
        <Route path="/admin/rentals" element={<Admin />} />
        <Route path="/admin/farm-management" element={<Admin />} />
        <Route path="/admin/farm-management/:registrationId" element={<Admin />} />
        <Route path="/admin/:registrationId" element={<Admin />} />
        <Route path="/farmadmin" element={<FarmAdmin />} />
        <Route path="/farmer" element={<Farmer />} />
        <Route path="/farmer/profile" element={<Farmer />} />
        <Route path="/farmer/community" element={<Farmer />} />
        <Route path="/farmer/farmte" element={<Farmer />} />
        <Route path="/farmer/market" element={<Farmer />} />
        <Route path="/farmer/weather" element={<Farmer />} />
        <Route path="/farmer/maps" element={<Farmer />} />
        <Route path="/farmer/rentals" element={<Farmer />} />
        <Route path="/farmer/user/:userId" element={<Farmer />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
