import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { useLegalModal } from '../context/LegalModalContext';

const Footer = ({ forceShow = true }) => {
  const { openModal } = useLegalModal();

  return (
    <footer className={`modern-footer ${!forceShow ? 'scroll-visible' : ''}`}>
      <div className="footer-content">
        <div className="footer-section">
          <h3>FAQ</h3>
          <div className="faq-links">
            <ul>
              <li><Link to="/faqs?category=Delivery">Delivery Information</Link></li>
              <li><Link to="/faqs?category=Returns">Returns & Exchanges</Link></li>
              <li><Link to="/faqs?category=Payment">Payment Methods</Link></li>
              <li><Link to="/faqs?category=Products">Product Availability</Link></li>
              <li><Link to="/contact">Contact Support</Link></li>
            </ul>
          </div>
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
            <a href="https://www.facebook.com/pakbettv" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://www.instagram.com/pakbettv/" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://www.tiktok.com/@pakbettv.com?is_from_webapp=1&sender_device=pc" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-tiktok"></i>
            </a>
            <a href="https://www.youtube.com/c/PakBetTV" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
          <div className="contact-info">
            <h4>NEED HELP?</h4>
            <p><i className="far fa-envelope"></i> admin@pakbettv.com</p>
            <p><i className="fas fa-phone-alt"></i> 0981-194-9999</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="copyright">
            <p>COPYRIGHT 2025 FENG SHUI BY PAKBET TV. ALL RIGHTS RESERVED.</p>
          </div>
          <div className="footer-links">
            <button 
              className="footer-link-button" 
              onClick={() => openModal('terms')}
            >
              Terms of Use
            </button>
            <button 
              className="footer-link-button" 
              onClick={() => openModal('privacy')}
            >
              Privacy Policy
            </button>
            <button 
              className="footer-link-button" 
              onClick={() => openModal('refund')}
            >
              Refund Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 