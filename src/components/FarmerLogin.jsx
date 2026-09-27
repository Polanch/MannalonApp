import { useEffect, useRef, useState } from 'react';
import close from '../assets/images/close2.png';  
import rice1 from '../assets/images/rice.png';
import rice2 from '../assets/images/rice2.png';
import rice3 from '../assets/images/rice3.png';
import FarmerRegister from './FarmerRegister.jsx';
function FarmerLogin({ onClose, initialView = 'login' }) {
    const [mobileNumber, setMobileNumber] = useState('');
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

    return (
        <div className="farmer-log-wrapper" role="dialog" aria-modal="true" aria-label={isRegistering && !isReturningToLogin ? 'Farmer registration' : 'Farmer login'}>
            <div className={`farmer-login-box${isRegistering ? ' is-registering' : ''}`}>
                <div className="farmer-login-header">
                    <h1>Hello !</h1>
                    <p>Welcome back to MannalonApp</p>
                </div>
                <div className="farmer-auth-viewport">
                    <div className={`farmer-auth-track${isRegistering && !isReturningToLogin ? ' register-active' : ''}`}>
                        <div className="farmer-login-form">
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
                                />
                            </div>
                            <div className="farmer-login-field">
                                <label htmlFor="farmer-password">Password</label>
                                <input id="farmer-password" name="password" type="password" placeholder="Password" />
                            </div>
                            <a href="#forgotPassword" className="forgot-password-link">Forgot Password?</a>
                            <button type="button" className="farmer-login-submit">Login</button>
                            <p>Don't have an account? <button type="button" className="farmer-register-switch" onClick={openRegistration}>Sign up</button></p>
                            </div>
                        </div>
                        <div className="farmer-register-form-panel">
                            <div className="farmer-login-subheader">
                                <img src={rice3} alt="Rice" className="rice2" />
                                <h1>Register</h1>
                            </div>
                            <FarmerRegister onCancel={returnToLogin} />
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