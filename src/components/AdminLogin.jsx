import { useState } from 'react'
import axios from 'axios'
import minihero1 from '../assets/images/mini-hero1.png'
import location from '../assets/images/placeholder.gif'
import hero1 from '../assets/images/hero1.png'
import logo from '../assets/images/MannalonLogo.png'

function Login({ onLogin }){
    const [userId, setUserId] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(event){
        event.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const response = await axios.post(
                'http://localhost:8080/api/auth/login',
                { userId, password },
                { withCredentials: true },
            )
            const { success, role } = response.data

            if (success && role === 'MAO-Admin') {
                onLogin()
            } else {
                setError('Invalid administrator credentials.')
            }
        } catch (error) {
            setError(
                error.response?.data?.message ||
                'Unable to log in. Check your credentials or try again later.'
            )
        } finally {
            setIsLoading(false)
        }
    }

    return(
        <div className="admin-login-container">
            <div className="admin-box">
                <img src={logo} className="admin-logo" />
                <img src={hero1} className="admin-hero" />
                <h4>BRINGING IT SOLUTIONS TO TRADITIONAL FARMING</h4>
                <div className="underline">
                    <span className="line"></span>
                    <span className="circle"></span>
                    <span className="line"></span>
                </div>
                <p>ALL RIGHTS RESERVED 2026.</p>
            </div>

            <div className="admin-box">
                <form className="login-container" onSubmit={handleSubmit}>
                    <h1>Municipality of Agriculture</h1>
                    <h6><img src={location} className="admin-location" /> Aparri Cagayan, Region II</h6>
                    <img src={minihero1} className="admin-mini-hero" />
                    <div className="input-group">
                        <label htmlFor="employee-id">Employee ID</label>
                        <input
                            id="employee-id"
                            name="employeeId"
                            type="text"
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </div>
                    <a href="#forgotPassword">Forgot Password</a>
                    {error && <p className="login-error" role="alert">{error}</p>}
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'LOGGING IN...' : 'LOG IN'}
                    </button>
                    <p>This page is strictly confidential and restricted to authorized personnel only.</p>
                </form>
            </div>
        </div>
    )
}

export default Login;