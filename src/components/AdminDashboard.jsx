function AdminDashboard({ onLogout }){
    return(
        <>
        <h1>Dashboard here</h1>
        <button type="button" onClick={onLogout}>LOG OUT</button>
        </>
    )
}

export default AdminDashboard;