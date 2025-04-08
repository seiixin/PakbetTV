import React, { useState, useEffect } from 'react';
import './NavBar.css';

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav className={`navbar red ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <div className="logo-text">
            <h3>MICHAEL DE MESA</h3>
            <p>BAZI & FENG SHUI CONSULTANCY</p>
          </div>
        </div>
        
        <ul className="navbar-menu">
          <li className="navbar-item">
            <a href="#" className="navbar-link">Shop</a>
          </li>
          <li className="navbar-item">
            <a href="#" className="navbar-link">Consultations</a>
          </li>
          <li className="navbar-item">
            <a href="#" className="navbar-link">Horoscope</a>
          </li>
          <li className="navbar-item">
            <a href="#" className="navbar-link">Blogs</a>
          </li>
          <li className="navbar-item">
            <a href="#" className="navbar-link">Free Tools</a>
          </li>
        </ul>
        
        <div className="navbar-actions">
          <div className="search-bar">
            <input type="text" placeholder="Search for a product" />
            <button className="search-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
          
          <div className="navbar-buttons">
            <button className="profile-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Nhorbert Candano</span>
            </button>
            <button className="cart-button">
              <span>Cart (0)</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cart-icon">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 