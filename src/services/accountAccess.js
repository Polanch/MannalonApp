export function clearLocalAccount() {
    for (const key of [
        'farmerSession', 'adminAuthenticated', 'adminName', 'farmAdminAuthenticated', 'farmAdminUserId',
        'farmAdminName', 'farmAdminProfilePictureUrl', 'farmAdminActiveView', 'farmAdminViewedUserId',
    ]) sessionStorage.removeItem(key)
}

export function routeBlockedLogin(error, navigate) {
    if (error.response?.data?.status !== 'BLOCKED') return false
    clearLocalAccount()
    navigate('/appeal', { replace: true })
    return true
}
