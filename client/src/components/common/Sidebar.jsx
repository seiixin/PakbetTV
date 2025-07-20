import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isMobileMenuOpen, closeMobileMenu, scrollToSection }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const toggleDropdown = (key) => {
    setActiveDropdown(prev => (prev === key ? null : key));
  };

  return (
    <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="mobile-nav-header">
        <h3>Menu</h3>
        <button className="mobile-close-btn" onClick={closeMobileMenu}>
          <i className="fas fa-arrow-left"></i>
        </button>
      </div>

      <div className="nav-menu">
        <Link to="/shop" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-store"></i></div>
          <span className="nav-text">ALL PRODUCTS</span>
        </Link>
        <div className="nav-item" onClick={() => scrollToSection('new-arrivals-section')}>
          <div className="nav-icon"><i className="fas fa-star"></i></div>
          <span className="nav-text">WHAT'S NEW?</span>
        </div>
        <div className="nav-item" onClick={() => scrollToSection('best-sellers-section')}>
          <div className="nav-icon"><i className="fas fa-trophy"></i></div>
          <span className="nav-text">BEST SELLERS</span>
        </div>
        <div className="nav-item" onClick={() => scrollToSection('flash-deals-section')}>
          <div className="nav-icon"><i className="fas fa-bolt"></i></div>
          <span className="nav-text">FLASH DEALS</span>
        </div>

        {/* AMULETS */}
        <div className="custom-dropdown">
          <div className="custom-dropdown-header" onClick={() => toggleDropdown('amulets')}>
            <div className="nav-icon"><i className="fas fa-gem"></i></div>
            <span className="nav-text">AMULETS</span>
            <i className={`fas ${activeDropdown === 'amulets' ? 'fa-chevron-down' : 'fa-chevron-right'} nav-chevron`}></i>
          </div>
          {activeDropdown === 'amulets' && (
            <div className="custom-dropdown-content">
              <Link to="/category/keychains" onClick={closeMobileMenu}>Keychains</Link>
              <Link to="/category/medallions" onClick={closeMobileMenu}>Medallions</Link>
              <Link to="/category/plaque" onClick={closeMobileMenu}>Plaque</Link>
              <Link to="/category/talisman-card" onClick={closeMobileMenu}>Talisman Card</Link>
            </div>
          )}
        </div>

        {/* FENG SHUI FASHION */}
        <div className="custom-dropdown">
          <div className="custom-dropdown-header" onClick={() => toggleDropdown('feng')}>
            <div className="nav-icon"><i className="fas fa-tshirt"></i></div>
            <span className="nav-text">FENG SHUI FASHION</span>
            <i className={`fas ${activeDropdown === 'feng' ? 'fa-chevron-down' : 'fa-chevron-right'} nav-chevron`}></i>
          </div>
          {activeDropdown === 'feng' && (
            <div className="custom-dropdown-content">
              <Link to="/category/earrings" onClick={closeMobileMenu}>Earrings</Link>
              <Link to="/category/necklaces" onClick={closeMobileMenu}>Necklaces</Link>
              <Link to="/category/pendants" onClick={closeMobileMenu}>Pendants</Link>
              <Link to="/category/rings" onClick={closeMobileMenu}>Rings</Link>
              <Link to="/category/scarves-shawls" onClick={closeMobileMenu}>Scarves & Shawls</Link>
              <Link to="/category/wallets" onClick={closeMobileMenu}>Wallets</Link>
            </div>
          )}
        </div>

        {/* INCENSE */}
        <div className="custom-dropdown">
          <div className="custom-dropdown-header" onClick={() => toggleDropdown('incense')}>
            <div className="nav-icon"><i className="fas fa-fire"></i></div>
            <span className="nav-text">INCENSE & SPACE CLEARING</span>
            <i className={`fas ${activeDropdown === 'incense' ? 'fa-chevron-down' : 'fa-chevron-right'} nav-chevron`}></i>
          </div>
          {activeDropdown === 'incense' && (
            <div className="custom-dropdown-content">
              <Link to="/category/incense-holder-burner" onClick={closeMobileMenu}>Incense Holder & Burner</Link>
              <Link to="/category/incense-sticks" onClick={closeMobileMenu}>Incense Sticks</Link>
              <Link to="/category/singing-bowl" onClick={closeMobileMenu}>Singing Bowl</Link>
              <Link to="/category/smudge-kit" onClick={closeMobileMenu}>Smudge Kit</Link>
              <Link to="/category/wishing-paper" onClick={closeMobileMenu}>Wishing Paper</Link>
            </div>
          )}
        </div>

        {/* Single links */}
        <Link to="/category/auspicious-home-decor" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-home"></i></div>
          <span className="nav-text">AUSPICIOUS HOME DECOR</span>
        </Link>
        <Link to="/category/feng-shui-bracelets" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-circle"></i></div>
          <span className="nav-text">FENG SHUI BRACELETS</span>
        </Link>
        <Link to="/category/feng-shui-books" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-book"></i></div>
          <span className="nav-text">FENG SHUI BOOKS</span>
        </Link>
        <Link to="/category/windchimes" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-music"></i></div>
          <span className="nav-text">WINDCHIMES</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
