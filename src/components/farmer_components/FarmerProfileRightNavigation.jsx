import { PERSONAL_FIELDS } from './farmerProfileFields.js'
import mannalonLogo from '../../assets/images/MannalonLogo.png'

const FARM_FIELDS = [
    ['farmCode', 'Farm code'],
    ['farmName', 'Farm name'],
    ['farmType', 'Farm type'],
    ['roleName', 'Your role'],
    ['irrigationType', 'Irrigation'],
    ['areaHectares', 'Area (ha)'],
    ['barangay', 'Barangay'],
    ['municipalityCity', 'Municipality / City'],
    ['province', 'Province'],
    ['region', 'Region'],
    ['farmAdminName', 'Farm admin'],
]

function FarmerProfileRightNavigation({ profile }) {
    const farm = profile?.farm
    return (
        <div className="farmer-dashboard-right-navigation">
            <div className="farmer-right-content">
                <section className="farmer-sidebar-section farmer-right-first-section">
                    <h2>Personal Information</h2>
                    <div className="farmer-receipt">
                        <img src={mannalonLogo} className="farmer-receipt-logo" alt="Mannalon" />
                        <p className="farmer-receipt-title">MANNALON FARMER</p>
                        <p className="farmer-receipt-sub">Personal Information</p>
                        <hr className="farmer-receipt-divider" />
                        <dl className="farmer-receipt-list">
                            {PERSONAL_FIELDS.map(([key, label]) => (
                                <div key={key} className="farmer-receipt-row">
                                    <dt>{label}</dt>
                                    <dd>{profile?.[key] || '—'}</dd>
                                </div>
                            ))}
                        </dl>
                        <hr className="farmer-receipt-divider" />
                        <p className="farmer-receipt-foot">Mobile: {profile?.userId}</p>
                        <p className="farmer-receipt-foot">*** THANK YOU FOR FARMING ***</p>
                    </div>
                </section>
                <section className="farmer-sidebar-section">
                    <h2>My Farm</h2>
                    <div className="farmer-receipt">
                        <img src={mannalonLogo} className="farmer-receipt-logo" alt="Mannalon" />
                        <p className="farmer-receipt-title">{farm?.farmName?.toUpperCase() || 'FARM'}</p>
                        <p className="farmer-receipt-sub">Associated Farm</p>
                        <hr className="farmer-receipt-divider" />
                        <dl className="farmer-receipt-list">
                            {FARM_FIELDS.map(([key, label]) => (
                                <div key={key} className="farmer-receipt-row">
                                    <dt>{label}</dt>
                                    <dd>{farm?.[key] || '—'}</dd>
                                </div>
                            ))}
                        </dl>
                        <hr className="farmer-receipt-divider" />
                        <p className="farmer-receipt-foot">*** MEMBER OF THIS FARM ***</p>
                    </div>
                </section>
            </div>

            <footer className="farmer-sidebar-copyright">
                <p>Mannalon Rules</p>
                <p>Privacy Policy User Agreement</p>
                <p>Accessibility</p>
                <p>© MannalonApp 2026. All rights reserved.</p>
            </footer>
        </div>
    )
}

export default FarmerProfileRightNavigation
