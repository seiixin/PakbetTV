import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = ({ forceShow = true }) => {
  return (
    <footer className={`modern-footer ${!forceShow ? 'scroll-visible' : ''}`}>
      <div className="footer-content">
        <div className="footer-section">
          <h3>FAQ</h3>
          <ul>
            <li><Link to="/faqs">Frequently Asked Questions</Link></li>
            <li><Link to="/faqs?category=delivery">Delivery</Link></li>
            <li><Link to="/faqs?category=returns">Return/Exchange</Link></li>
            <li><Link to="/faqs?category=orders">Order/Cancellation</Link></li>
            <li><Link to="/faqs?category=payment">Payment</Link></li>
            <li><Link to="/faqs?category=products">Product Availability</Link></li>
            <li><Link to="/faqs?category=services">Gift Wrapping Services</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>VISIT US</h3>
          <div className="location-info">
            <p>Feng Shui by Pakbet TV</p>
            <p>Unit 1004 Cityland Shaw Tower</p>
            <p>Corner St. Francis, Shaw Blvd.</p>
            <p>Mandaluyong City, Philippines</p>
            <div className="hours">
              <p className="hours-title">Hours</p>
              <p>Monday - Sunday: 8:00 AM - 5:00 PM</p>
              <p>Public Holidays: CLOSED</p>
            </div>
          </div>
        </div>

        <div className="footer-section">
          <h3>FOLLOW US</h3>
          <div className="social-icons">
            <a href="https://www.facebook.com/pakbettv" className="social-icon">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://www.instagram.com/pakbettv/" className="social-icon">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://www.youtube.com/c/PakBetTV" className="social-icon">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
          <div className="contact-info">
            <h4>NEED HELP?</h4>
            <p><i className="far fa-envelope"></i> admin@pakbettv.com</p>
            <p><i className="fas fa-phone-alt"></i> 0976 120 3535</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="copyright">
            <p>COPYRIGHT 2025 FENG SHUI BY PAKBET TV. ALL RIGHTS RESERVED.</p>
          </div>
          <div className="footer-links">
            <Link to="#">Terms of Use</Link>
            <Link to="#">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 