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
          <div className="nav-icon"><img src="/Shop_Icon/2_WhatsNewIcon.png" alt="" /></div>
          <span className="nav-text">ALL PRODUCTS</span>
        </Link>

        <div className="nav-item" onClick={() => scrollToSection('new-arrivals-section')}>
          <div className="nav-icon"><img src="/Shop_Icon/2_WhatsNewIcon.png" alt="" /></div>
          <span className="nav-text">WHAT'S NEW?</span>
        </div>

        <div className="nav-item" onClick={() => scrollToSection('best-sellers-section')}>
          <div className="nav-icon"><img src="/Shop_Icon/3FlashSale.png" alt="" /></div>
          <span className="nav-text">BEST SELLERS</span>
        </div>

        <div className="nav-item" onClick={() => scrollToSection('flash-deals-section')}>
          <div className="nav-icon"><img src="/Shop_Icon/4_Flash Sale.png" alt="" /></div>
          <span className="nav-text">FLASH DEALS</span>
        </div>

        {/* AMULETS */}
        <div className="custom-dropdown">
          <div className="custom-dropdown-header" onClick={() => toggleDropdown('amulets')}>
            <div className="nav-icon"><img src="/Shop_Icon/5_1Amulets.png" alt="" /></div>
            <span className="nav-text">AMULETS</span>
            <i className={`fas ${activeDropdown === 'amulets' ? 'fa-chevron-down' : 'fa-chevron-right'} nav-chevron`}></i>
          </div>
          {activeDropdown === 'amulets' && (
            <div className="custom-dropdown-content">
              <Link to="/category/keychains" onClick={closeMobileMenu}><img src="/Shop_Icon/4aKeychain.png" alt="" /> Keychains</Link>
              <Link to="/category/medallions" onClick={closeMobileMenu}><img src="/Shop_Icon/4bMedallion.png" alt="" /> Medallions</Link>
              <Link to="/category/plaque" onClick={closeMobileMenu}><img src="/Shop_Icon/4cPlaque.png" alt="" /> Plaque</Link>
              <Link to="/category/talisman-card" onClick={closeMobileMenu}><img src="/Shop_Icon/4dTalismanCard.png" alt="" /> Talisman Card</Link>
            </div>
          )}
        </div>

        {/* FENG SHUI FASHION */}
        <div className="custom-dropdown">
          <div className="custom-dropdown-header" onClick={() => toggleDropdown('feng')}>
            <div className="nav-icon"><img src="/Shop_Icon/6_1FengShuiFashion.png" alt="" /></div>
            <span className="nav-text">FENG SHUI FASHION</span>
            <i className={`fas ${activeDropdown === 'feng' ? 'fa-chevron-down' : 'fa-chevron-right'} nav-chevron`}></i>
          </div>
          {activeDropdown === 'feng' && (
            <div className="custom-dropdown-content">
              <Link to="/category/earrings" onClick={closeMobileMenu}><img src="/Shop_Icon/6_2Earrings.png" alt="" /> Earrings</Link>
              <Link to="/category/necklaces" onClick={closeMobileMenu}><img src="/Shop_Icon/6_3Necklaces.png" alt="" /> Necklaces</Link>
              <Link to="/category/pendants" onClick={closeMobileMenu}><img src="/Shop_Icon/6_4Pendants.png" alt="" /> Pendants</Link>
              <Link to="/category/rings" onClick={closeMobileMenu}><img src="/Shop_Icon/6_5Rings.png" alt="" /> Rings</Link>
              <Link to="/category/scarves-shawls" onClick={closeMobileMenu}><img src="/Shop_Icon/6_6Scarves_Shawls.png" alt="" /> Scarves & Shawls</Link>
              <Link to="/category/wallets" onClick={closeMobileMenu}><img src="/Shop_Icon/6_7Wallets.png" alt="" /> Wallets</Link>
            </div>
          )}
        </div>

        {/* INCENSE */}
        <div className="custom-dropdown">
          <div className="custom-dropdown-header" onClick={() => toggleDropdown('incense')}>
            <div className="nav-icon"><img src="/Shop_Icon/7_1Incense&SpaceClearing.png" alt="" /></div>
            <span className="nav-text">INCENSE & SPACE CLEARING</span>
            <i className={`fas ${activeDropdown === 'incense' ? 'fa-chevron-down' : 'fa-chevron-right'} nav-chevron`}></i>
          </div>
          {activeDropdown === 'incense' && (
            <div className="custom-dropdown-content">
              <Link to="/category/incense-holder-burner" onClick={closeMobileMenu}><img src="/Shop_Icon/9aIncenseHolder_Burner.png" alt="" /> Incense Holder & Burner</Link>
              <Link to="/category/incense-sticks" onClick={closeMobileMenu}><img src="/Shop_Icon/9bIncenseSticks.png" alt="" /> Incense Sticks</Link>
              <Link to="/category/singing-bowl" onClick={closeMobileMenu}><img src="/Shop_Icon/9cSingingBowl.png" alt="" /> Singing Bowl</Link>
              <Link to="/category/smudge-kit" onClick={closeMobileMenu}><img src="/Shop_Icon/9dSmudgeKit.png" alt="" /> Smudge Kit</Link>
              <Link to="/category/wishing-paper" onClick={closeMobileMenu}><img src="/Shop_Icon/9eWishingPaper.png" alt="" /> Wishing Paper</Link>
            </div>
          )}
        </div>

        {/* Single links */}
        <Link to="/category/auspicious-home-decor" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><img src="/Shop_Icon/5AuspiciousHomeDecor.png" alt="" /></div>
          <span className="nav-text">AUSPICIOUS HOME DECOR</span>
        </Link>

        <Link to="/category/feng-shui-bracelets" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><img src="/Shop_Icon/9FengShuiBracelet.png" alt="" /></div>
          <span className="nav-text">FENG SHUI BRACELETS</span>
        </Link>

        <Link to="/category/feng-shui-books" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><img src="/Shop_Icon/10FengShuiBooks.png" alt="" /></div>
          <span className="nav-text">FENG SHUI BOOKS</span>
        </Link>

        <Link to="/category/windchimes" className="nav-item" onClick={closeMobileMenu}>
          <div className="nav-icon"><img src="/Shop_Icon/10Windchimes.png" alt="" /></div>
          <span className="nav-text">WINDCHIMES</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
