import MannalonLogo from '../assets/images/MannalonLogo.png'
function AdminHeader({ onLogout }){
    return(
        <div className="admin-header">
            <div className="admin-header-container">
                <img src={MannalonLogo} alt="Mannalon Logo" className="admin-logo"  />
                <button onClick={onLogout}>Logout</button>
            </div>
        </div>
    )
}

export default AdminHeader;