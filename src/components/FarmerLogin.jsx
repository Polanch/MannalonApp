import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import close from '../assets/images/close2.png';  
import rice1 from '../assets/images/rice.png';
import rice2 from '../assets/images/rice2.png';
import rice3 from '../assets/images/rice3.png';
import FarmerRegister from './FarmerRegister.jsx';
import { buildFarmerSession, saveFarmerSession } from '../services/farmerApi.js';

function getFarmerStatusMessage(status) {
    const messages = {
        PENDING: 'Your Farmer account is waiting for Farm-Admin approval.',
        REJECTED: 'Your Farmer registration was rejected. Please contact your Farm-Admin.',
        INACTIVE: 'Your Farmer account is inactive. Please contact your Farm-Admin.',
    };

    return messages[status?.toUpperCase()]
}

function FarmerLogin({ onClose, initialView = 'login' }) {
    const navigate = useNavigate();
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
    const [isRegistering, setIsRegistering] = useState(initialView === 'register');
    const [isReturningToLogin, setIsReturningToLogin] = useState(false);
    const returnTimerRef = useRef(null);

    useEffect(() => () => window.clearTimeout(returnTimerRef.current), []);

    function openRegistration() {
        window.clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
        setIsReturningToLogin(false);
        setIsRegistering(true);
    }

    function returnToLogin() {
        if (!isRegistering || isReturningToLogin) {
            return;
        }

        setIsReturningToLogin(true);
        returnTimerRef.current = window.setTimeout(() => {
            setIsRegistering(false);
            setIsReturningToLogin(false);
            returnTimerRef.current = null;
        }, 450);
    }

    async function submitRegistration(registrationData) {
        await axios.post(
            'http://localhost:8080/api/farmer/registrations',
            registrationData,
            { withCredentials: true },
        );
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();
        setLoginError('');

        if (!/^09\d{9}$/.test(mobileNumber)) {
            setLoginError('Enter a valid 11-digit mobile number starting with 09.');
            return;
        }

        if (!password) {
            setLoginError('Enter your password.');
            return;
        }

        setIsSubmittingLogin(true);

        try {
            const response = await axios.post(
                'http://localhost:8080/api/auth/login',
                { userId: mobileNumber, password },
                { withCredentials: true },
            );
            const { success, role, status, accountStatus } = response.data;
            const farmerStatus = status || accountStatus;

            if (success && role === 'Farmer' && (!farmerStatus || ['ACTIVE', 'APPROVED'].includes(farmerStatus.toUpperCase()))) {
                saveFarmerSession(buildFarmerSession(response.data, mobileNumber));
                navigate('/farmer');
                return;
            }

            setLoginError(getFarmerStatusMessage(farmerStatus) || 'This account is not an active Farmer account.');
        } catch (error) {
            const responseData = error.response?.data;
            const farmerStatus = responseData?.status || responseData?.accountStatus;
            setLoginError(
                getFarmerStatusMessage(farmerStatus) ||
                responseData?.message ||
                responseData?.detail ||
                responseData?.error ||
                'Unable to log in. Check your details or try again later.'
            );
        } finally {
            setIsSubmittingLogin(false);
        }
    }

    return (
        <div className="farmer-log-wrapper" role="dialog" aria-modal="true" aria-label={isRegistering && !isReturningToLogin ? 'Farmer registration' : 'Farmer login'}>
            <div className={`farmer-login-box${isRegistering ? ' is-registering' : ''}`}>
                <div className="farmer-login-header">
                    <h1>Hello !</h1>
                    <p>Welcome back to MannalonApp</p>
                </div>
                <div className="farmer-auth-viewport">
                    <div className={`farmer-auth-track${isRegistering && !isReturningToLogin ? ' register-active' : ''}`}>
                        <form className="farmer-login-form" onSubmit={handleLoginSubmit} noValidate>
                            <div className="farmer-login-subheader">
                                <img src={rice2} alt="Rice" className="rice2" />
                                <h1>Login</h1>
                            </div>
                            <div className="farmer-login-inputs">
                                <div className="farmer-login-field">
                                    <label htmlFor="farmer-mobile-number">Mobile Number</label>
                                    <input
                                        id="farmer-mobile-number"
                                        name="mobileNumber"
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="09xxxxxxxxx"
                                        maxLength={11}
                                        value={mobileNumber}
                                        onChange={(event) => setMobileNumber(event.target.value.replace(/\D/g, '').slice(0, 11))}
                                        autoComplete="tel"
                                    />
                                </div>
                                <div className="farmer-login-field">
                                    <label htmlFor="farmer-password">Password</label>
                                    <input
                                        id="farmer-password"
                                        name="password"
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        autoComplete="current-password"
                                    />
                                </div>
                                {loginError && <p className="farmer-register-error" role="alert">{loginError}</p>}
                                <button type="submit" className="farmer-login-submit" disabled={isSubmittingLogin}>
                                    {isSubmittingLogin ? 'Logging in...' : 'Login'}
                                </button>
                                <p>Don't have an account? <button type="button" className="farmer-register-switch" onClick={openRegistration}>Register</button></p>
                            </div>
                        </form>
                        <div className="farmer-register-form-panel">
                            <div className="farmer-login-subheader">
                                <img src={rice3} alt="Rice" className="rice2" />
                                <h1>Register</h1>
                            </div>
                            <FarmerRegister
                                onCancel={returnToLogin}
                                onSubmitRegistration={submitRegistration}
                            />
                        </div>
                    </div>
                </div>
                <img src={rice1} alt="Rice" className="rice1" />
                <button type="button" className="farmer-close-btn" onClick={onClose} aria-label="Close farmer login">
                    <img src={close} alt="" />
                </button>
            </div>
        </div>
    );
}

export default FarmerLogin;