import { useState } from 'react'
import '../assets/styles/landing.css'
import LandingHeader from '../components/LandingHeader.jsx';
import hero2 from '../assets/images/hero2.png';
import Mao from '../assets/images/mao.png';
import rice from '../assets/images/rice.png';
import LandingFooter from '../components/LandingFooter.jsx';
import FarmAdminLogin from '../components/FarmAdminLogin.jsx';
import FarmerLogin from '../components/FarmerLogin.jsx';
import { Navigate } from 'react-router-dom'
import { getFarmerSession } from '../services/farmerApi.js'
function LandingPage({ initialAdminPortalOpen = false, onAdminLoginSuccess, onAdminPortalClose }){
    const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(initialAdminPortalOpen)
    const [farmerAuthInitialView, setFarmerAuthInitialView] = useState(null)

    if (getFarmerSession()) {
        return <Navigate to="/farmer" replace />
    }

    function closeAdminPortal() {
        setIsAdminPortalOpen(false)
        onAdminPortalClose?.()
    }

    return (
        <div className="landing-page">
            <LandingHeader onAdminPortal={() => setIsAdminPortalOpen(true)} />
            <div className="section-1">
                <div className="section-1-container">
                    <img src={hero2} alt="Hero" className="land-hero" />
                    <div className="section-1-content">
                        <div className="section-1-content-logo">
                            <img src={Mao} alt="Mao" className="mao-logo" />
                            <p>Municipality of Agriculture</p>
                            <p>Aparri, Cagayan Region II</p>
                        </div>
                        <div className="section-1-content-header">
                            <h1>Technology That Grows <br/>With You</h1>
                            <p>Transform your farming operations with intelligent monitoring,<br/> real-time market insights, and weather-driven decision making.</p>
                        </div>
                        <div className="section-1-content-buttons">
                            <button type="button" onClick={() => setFarmerAuthInitialView('register')}>Create Account</button>
                            <button type="button" onClick={() => setFarmerAuthInitialView('login')}>Login</button>
                        </div>
                    </div>
                    <div className="rice">
                        <div className="rice-holder">
                            <img src={rice} alt="Rice" className="rice-img" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="section-2">
                <div className="section-2-container">
                    <h2>What is MannalonApp?</h2>
                    <p className="section-2-intro">An intelligent farm management platform designed for all types of farmers in Cagayan Province</p>
                    <div className="section-2-boxes">
                        <article className="s2-box">
                            <span className="s2-icon" aria-hidden="true">📊</span>
                            <h3>Farm Monitoring</h3>
                            <p>Track your crops in real-time with advanced monitoring tools. Get alerts for soil conditions, water levels, and crop health.</p>
                        </article>
                        <article className="s2-box">
                            <span className="s2-icon" aria-hidden="true">💰</span>
                            <h3>Market Insights</h3>
                            <p>Stay ahead with real-time market prices, demand forecasts, and buyer connections to maximize your profits.</p>
                        </article>
                        <article className="s2-box">
                            <span className="s2-icon" aria-hidden="true">🌤️</span>
                            <h3>Weather Alerts</h3>
                            <p>Get timely weather predictions and alerts customized for your location to plan farming activities effectively.</p>
                        </article>
                    </div>
                </div>
            </div>
            <div className="section-3">
                <div className="section-3-container">
                    <h2>Available Services</h2>
                    <p className="section-3-intro">Comprehensive tools to manage every aspect of your farming operation</p>
                    <div className="section-3-services">
                        <article className="service-card">
                            <span className="service-icon" aria-hidden="true">📈</span>
                            <h3>Yield Forecast</h3>
                            <p>AI-powered predictions for crop yield based on soil data, weather patterns, and historical trends.</p>
                            <a href="#yield-forecast">Learn More <span aria-hidden="true">→</span></a>
                        </article>
                        <article className="service-card">
                            <span className="service-icon" aria-hidden="true">🧬</span>
                            <h3>Soil Analysis</h3>
                            <p>Detailed soil health reports with recommendations for optimal fertilizer and nutrient management.</p>
                            <a href="#soil-analysis">Learn More <span aria-hidden="true">→</span></a>
                        </article>
                        <article className="service-card">
                            <span className="service-icon" aria-hidden="true">🐛</span>
                            <h3>Pest Tracking</h3>
                            <p>Monitor pest infestations and receive early warnings with integrated pest management solutions.</p>
                            <a href="#pest-tracking">Learn More <span aria-hidden="true">→</span></a>
                        </article>
                        <article className="service-card">
                            <span className="service-icon" aria-hidden="true">🚜</span>
                            <h3>Equipment Booking</h3>
                            <p>Rent or book farming equipment at affordable rates from verified suppliers in your area.</p>
                            <a href="#equipment-booking">Learn More <span aria-hidden="true">→</span></a>
                        </article>
                        <article className="service-card">
                            <span className="service-icon" aria-hidden="true">🌞</span>
                            <h3>Drying Tracking</h3>
                            <p>Monitor grain drying conditions and get alerts for optimal harvesting and storage timing.</p>
                            <a href="#drying-tracking">Learn More <span aria-hidden="true">→</span></a>
                        </article>
                        <article className="service-card">
                            <span className="service-icon" aria-hidden="true">💡</span>
                            <h3>Expert Consultation</h3>
                            <p>Connect with agricultural experts for personalized advice on your farming challenges and opportunities.</p>
                            <a href="#expert-consultation">Learn More <span aria-hidden="true">→</span></a>
                        </article>
                    </div>
                </div>
            </div>
            <LandingFooter />
            {farmerAuthInitialView && (
                <FarmerLogin
                    key={farmerAuthInitialView}
                    initialView={farmerAuthInitialView}
                    onClose={() => setFarmerAuthInitialView(null)}
                />
            )}
            {isAdminPortalOpen && (
                <div className="admin-portal-modal" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                        closeAdminPortal()
                    }
                }}>
                    <FarmAdminLogin
                        onClose={closeAdminPortal}
                        onLoginSuccess={onAdminLoginSuccess}
                    />
                </div>
            )}
        </div>
    );
}

export default LandingPage;