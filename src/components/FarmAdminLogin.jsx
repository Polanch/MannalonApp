import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import MannalonLogo from '../assets/images/MannalonLogo.png'
import maologo from '../assets/images/mao.png'
import checkmark from '../assets/images/check-mark.png'
import grass from '../assets/images/grass.png'
import emailicn from '../assets/images/email.png'
import keyicn from '../assets/images/key.png'
import close from '../assets/images/close.png'
import FarmAdminRegister from './FarmAdminRegister.jsx'
import { clearLocalAccount, routeBlockedLogin } from '../services/accountAccess.js'

function FarmAdminLogin({ onClose, onLoginSuccess }){
    const navigate = useNavigate()
    const [userId, setUserId] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCreatingAccount, setIsCreatingAccount] = useState(false)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [isRegisterExiting, setIsRegisterExiting] = useState(false)

    useEffect(() => {
        if (!isCreatingAccount) {
            return undefined
        }

        const transitionTimer = setTimeout(() => {
            setIsTransitioning(true)
        }, 3000)

        return () => clearTimeout(transitionTimer)
    }, [isCreatingAccount])

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            const response = await axios.post(
                'http://localhost:8080/api/auth/login',
                { userId, password },
                { withCredentials: true },
            )

            const { success, role } = response.data

            if (success && role === 'Farm-Admin') {
                clearLocalAccount()
                sessionStorage.setItem('farmAdminAuthenticated', 'true')
                sessionStorage.setItem('farmAdminUserId', userId)
                sessionStorage.setItem('farmAdminName', response.data.fullName || userId)
                sessionStorage.setItem('farmAdminProfilePictureUrl', response.data.profilePictureUrl || '')
                if (onLoginSuccess) {
                    onLoginSuccess()
                }
                navigate('/farmadmin')
                return
            }

            setError('Invalid Farm-Admin credentials.')
        } catch (loginError) {
            if (routeBlockedLogin(loginError, navigate)) return
            setError(
                loginError.response?.data?.message ||
                'Unable to log in. Check your credentials or try again later.'
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleCreateAccount(){
        setIsCreatingAccount(true)
    }

    function handleLogin(){
        setIsRegisterExiting(true)

        setTimeout(() => {
            setIsTransitioning(false)
            setIsRegisterExiting(false)
            setIsCreatingAccount(false)
        }, 800)
    }

    return(
        <div className="farm-admin-login-container">
            <div className="f-admin-box">
                <span className="logo-holder">
                    <img src={maologo} className="maologo" />
                    <p>Municipality of Agriculture</p>
                    <p>Aparri, Cagayan Region II</p>
                </span>
                
                <h1>Welcome to MannalonApp<sup>™</sup></h1>
                <p className="tagline">The official digital platform for Filipino Palay <br/>farmers to access grains data and farming guides.</p>
                <span className="ads-info">
                    <p><img src={checkmark} className="check" />Secured</p>
                    <p><img src={checkmark} className="check" />24/7 Access</p>
                    <p><img src={checkmark} className="check" />Fast Processing</p>
                </span>
                <img src={grass} className="grass2" />
            </div>
            <div className="f-admin-box">
                <div className="auth-panel-viewport">
                    <div className={`auth-panel-track${isTransitioning && !isRegisterExiting ? ' register-active' : ''}`}>
                        <form className="f-login-wrapper" onSubmit={handleSubmit}>
                            <img src={MannalonLogo} className="logo" />
                            <div className="f-admin-group1">
                                <label htmlFor="email"><img src={emailicn} className="icn" />Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    placeholder='Enter your email address'
                                    value={userId}
                                    onChange={(event) => setUserId(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="f-admin-group1">
                                <label htmlFor="password"><img src={keyicn} className="icn"/>Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder='Enter your password'
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                />
                            </div>
                            {error && <p className="login-error" role="alert">{error}</p>}
                            <a href="#forgotPassword">Forgot Password</a>
                            <button className="f-login-btn" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Logging in...' : 'Login'}
                            </button>
                            <div className="f-admin-group2">
                                <p>Need a Farm-Admin account? <button
                                    className="create-account-btn"
                                    type="button"
                                    onClick={handleCreateAccount}
                                    disabled={isCreatingAccount}
                                    aria-label={isCreatingAccount ? 'Creating account' : 'Create Farm-Admin account'}
                                >
                                    {isCreatingAccount ? (
                                        <span className="loading-dots" aria-hidden="true">
                                            <span></span><span></span><span></span>
                                        </span>
                                    ) : 'Create Account'}
                                </button></p>
                            </div>
                        </form>
                        <div className="register-slide-wrapper">
                            <FarmAdminRegister onLogin={handleLogin} />
                        </div>
                    </div>
                </div>
            </div>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close admin portal">
                <img src={close} className="icn" alt="" />
            </button>
        </div>
    )
}

export default FarmAdminLogin;