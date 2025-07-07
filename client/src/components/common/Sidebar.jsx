import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({
  isMobileMenuOpen,
  closeMobileMenu,
  scrollToSection
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const handleToggleDropdown = (key) => {
    setActiveDropdown(prev => prev === key ? null : key);
  };

  return (
    <div className={`left-navigation ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="mobile-nav-header">
        <h3>Menu</h3>
        <button className="mobile-close-btn" onClick={closeMobileMenu}>
          <i className="fas fa-arrow-left"></i>
        </button>
      </div>

      <div className="nav-menu">
        <Link to="/shop" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon">
            <i className="fas fa-store" style={{ color: '#A2201A' }}></i>
          </div>
          <span className="nav-text">ALL PRODUCTS</span>
        </Link>

        <div className="nav-item" onClick={() => scrollToSection('new-arrivals-section')}>
          <div className="nav-icon">
            <i className="fas fa-star" style={{ color: '#A2201A' }}></i>
          </div>
          <span className="nav-text">WHAT'S NEW?</span>
        </div>

        <div className="nav-item" onClick={() => scrollToSection('best-sellers-section')}>
          <div className="nav-icon">
            <i className="fas fa-trophy" style={{ color: '#A2201A' }}></i>
          </div>
          <span className="nav-text">BEST SELLERS</span>
        </div>

        <div className="nav-item" onClick={() => scrollToSection('flash-deals-section')}>
          <div className="nav-icon">
            <i className="fas fa-bolt" style={{ color: '#A2201A' }}></i>
          </div>
          <span className="nav-text">FLASH DEALS</span>
        </div>

        {/* AMULETS */}
        <div className="nav-item expandable">
          <div className="nav-item-header" onClick={() => handleToggleDropdown('amulets')}>
            <div className="nav-icon">
              <i className="fas fa-gem" style={{ color: '#A2201A' }}></i>
            </div>
            <span className="nav-text">AMULETS</span>
            <i className={`fas fa-chevron-right nav-arrow ${activeDropdown === 'amulets' ? 'expanded' : ''}`}></i>
          </div>
          {activeDropdown === 'amulets' && (
            <div className="nav-dropdown expanded">
              <Link to="/category/keychains" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-key"></i></div>
                <span className="nav-dropdown-text">Keychains</span>
              </Link>
              <Link to="/category/medallions" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-medal"></i></div>
                <span className="nav-dropdown-text">Medallions</span>
              </Link>
              <Link to="/category/plaque" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-square"></i></div>
                <span className="nav-dropdown-text">Plaque</span>
              </Link>
              <Link to="/category/talisman-card" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-id-card"></i></div>
                <span className="nav-dropdown-text">Talisman Card</span>
              </Link>
            </div>
          )}
        </div>

        {/* FENG SHUI FASHION */}
        <div className="nav-item expandable">
          <div className="nav-item-header" onClick={() => handleToggleDropdown('feng-shui-fashion')}>
            <div className="nav-icon">
              <i className="fas fa-tshirt" style={{ color: '#A2201A' }}></i>
            </div>
            <span className="nav-text">FENG SHUI FASHION</span>
            <i className={`fas fa-chevron-right nav-arrow ${activeDropdown === 'feng-shui-fashion' ? 'expanded' : ''}`}></i>
          </div>
          {activeDropdown === 'feng-shui-fashion' && (
            <div className="nav-dropdown expanded">
              <Link to="/category/earrings" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-circle"></i></div>
                <span className="nav-dropdown-text">Earrings</span>
              </Link>
              <Link to="/category/necklaces" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-gem"></i></div>
                <span className="nav-dropdown-text">Necklaces</span>
              </Link>
              <Link to="/category/pendants" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-star"></i></div>
                <span className="nav-dropdown-text">Pendants</span>
              </Link>
              <Link to="/category/rings" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-circle"></i></div>
                <span className="nav-dropdown-text">Rings</span>
              </Link>
              <Link to="/category/scarves-shawls" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-tshirt"></i></div>
                <span className="nav-dropdown-text">Scarves & Shawls</span>
              </Link>
              <Link to="/category/wallets" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-wallet"></i></div>
                <span className="nav-dropdown-text">Wallets</span>
              </Link>
            </div>
          )}
        </div>

        {/* INCENSE & SPACE CLEARING */}
        <div className="nav-item expandable">
          <div className="nav-item-header" onClick={() => handleToggleDropdown('incense-space-clearing')}>
            <div className="nav-icon">
              <i className="fas fa-fire" style={{ color: '#A2201A' }}></i>
            </div>
            <span className="nav-text">INCENSE & SPACE CLEARING</span>
            <i className={`fas fa-chevron-right nav-arrow ${activeDropdown === 'incense-space-clearing' ? 'expanded' : ''}`}></i>
          </div>
          {activeDropdown === 'incense-space-clearing' && (
            <div className="nav-dropdown expanded">
              <Link to="/category/incense-holder-burner" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-fire"></i></div>
                <span className="nav-dropdown-text">Incense Holder & Burner</span>
              </Link>
              <Link to="/category/incense-sticks" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-fire-alt"></i></div>
                <span className="nav-dropdown-text">Incense Sticks</span>
              </Link>
              <Link to="/category/singing-bowl" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-circle-notch"></i></div>
                <span className="nav-dropdown-text">Singing Bowl</span>
              </Link>
              <Link to="/category/smudge-kit" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-seedling"></i></div>
                <span className="nav-dropdown-text">Smudge Kit</span>
              </Link>
              <Link to="/category/wishing-paper" className="nav-dropdown-item" onClick={closeMobileMenu}>
                <div className="nav-dropdown-icon"><i className="fas fa-file-alt"></i></div>
                <span className="nav-dropdown-text">Wishing Paper</span>
              </Link>
            </div>
          )}
        </div>

        {/* Other categories */}
        <Link to="/category/auspicious-home-decor" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-home" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">AUSPICIOUS HOME DECOR</span>
        </Link>
        <Link to="/category/feng-shui-bracelets" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-circle" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">FENG SHUI BRACELETS</span>
        </Link>
        <Link to="/category/feng-shui-books" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-book" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">FENG SHUI BOOKS</span>
        </Link>
        <Link to="/category/windchimes" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><i className="fas fa-music" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">WINDCHIMES</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
