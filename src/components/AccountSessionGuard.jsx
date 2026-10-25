import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_ORIGIN } from '../services/farmerApi.js'
import { clearLocalAccount } from '../services/accountAccess.js'

function AccountSessionGuard() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        let checking = false
        async function check() {
            if (!['farmerSession', 'adminAuthenticated', 'farmAdminAuthenticated'].some((key) => sessionStorage.getItem(key))) return
            if (checking) return
            checking = true
            try {
                await axios.get(`${API_ORIGIN}/api/auth/session`, { withCredentials: true, timeout: 10000 })
                if (active) setError('')
            } catch (failure) {
                if (!active) return
                const status = failure.response?.data?.status
                if (['BLOCKED', 'INACTIVE'].includes(status) || failure.response?.status === 401) {
                    clearLocalAccount()
                    setError('')
                    navigate(status === 'BLOCKED' ? '/appeal' : '/', { replace: true })
                } else {
                    setError('Unable to verify your session. Check your connection.')
                }
            } finally {
                checking = false
            }
        }
        check()
        const timer = setInterval(check, 20000)
        return () => { active = false; clearInterval(timer) }
    }, [pathname, navigate])

    return error ? <p className="account-session-error" role="alert">{error}</p> : null
}

export default AccountSessionGuard
