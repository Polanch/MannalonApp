function LandingFooter() {
    return (
        <footer className="landing-footer">
            <div className="landing-footer-content">
                <div className="landing-footer-brand">
                    <h2>MannalonApp</h2>
                    <p>Smart tools for better farming.</p>
                </div>
                <div className="landing-footer-contact">
                    <h3>Contact Us</h3>
                    <a href="mailto:mannalon@support.com">mannalon@support.com</a>
                    <a href="tel:+639083184698">+639083184698</a>
                </div>
                <div className="landing-footer-legal">
                    <h3>Legal</h3>
                    <nav aria-label="Legal links">
                        <a href="/privacy-policy">Privacy Policy</a>
                        <a href="#terms-of-service">Terms of Service</a>
                        <a href="#cookie-policy">Cookie Policy</a>
                    </nav>
                </div>
            </div>
            <div className="landing-footer-bottom">
                <p>Developed by: John Lloyd F. Olipani, Christine Remigio, Krisha Arellano Publico</p>
                <p>© 2026 MannalonApp. All rights reserved.</p>
            </div>
        </footer>
    );
}

export default LandingFooter;
