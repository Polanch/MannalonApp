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
        <Route path="/admin/farm-management" element={<Admin />} />
        <Route path="/admin/farm-management/:registrationId" element={<Admin />} />
        <Route path="/admin/:registrationId" element={<Admin />} />
        <Route path="/farmadmin" element={<FarmAdmin />} />
        <Route path="/farmer" element={<Farmer />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
