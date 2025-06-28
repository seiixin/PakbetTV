import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import LegalModal from './common/LegalModal';

const Footer = ({ forceShow = true }) => {
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'terms' });

  const openLegalModal = (type) => {
    setLegalModal({ isOpen: true, type });
  };

  const closeLegalModal = () => {
    setLegalModal({ isOpen: false, type: 'terms' });
  };

  return (
    <footer className={`modern-footer ${!forceShow ? 'scroll-visible' : ''}`}>
      <div className="footer-content">
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
            <a href="https://www.tiktok.com/@pakbettv.com?is_from_webapp=1&sender_device=pc" className="social-icon">
              <i className="fab fa-tiktok"></i>
            </a>
            <a href="https://www.youtube.com/c/PakBetTV" className="social-icon">
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
              onClick={() => openLegalModal('terms')}
            >
              Terms of Use
            </button>
            <Link to="#">Privacy Policy</Link>
            <button 
              className="footer-link-button" 
              onClick={() => openLegalModal('refund')}
            >
              Refund Policy
            </button>
          </div>
        </div>
      </div>
      
      <LegalModal 
        isOpen={legalModal.isOpen} 
        onClose={closeLegalModal} 
        type={legalModal.type} 
      />
    </footer>
  );
};

export default Footer; 