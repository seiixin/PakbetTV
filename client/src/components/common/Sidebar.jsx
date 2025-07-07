import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({
  isMobileMenuOpen,
  closeMobileMenu,
  scrollToSection
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const handleToggleDropdown = (key) => {
    // Toggle dropdown only if it's not already active
    setActiveDropdown(prev => (prev === key ? null : key));
  };

  const handleDropdownItemClick = (e) => {
    e.stopPropagation(); // prevent parent toggle
    closeMobileMenu();
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
          <div className="nav-icon"><i className="fas fa-store" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">ALL PRODUCTS</span>
        </Link>

        <div className="nav-item" onClick={() => scrollToSection('new-arrivals-section')}>
          <div className="nav-icon"><i className="fas fa-star" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">WHAT'S NEW?</span>
        </div>

        <div className="nav-item" onClick={() => scrollToSection('best-sellers-section')}>
          <div className="nav-icon"><i className="fas fa-trophy" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">BEST SELLERS</span>
        </div>

        <div className="nav-item" onClick={() => scrollToSection('flash-deals-section')}>
          <div className="nav-icon"><i className="fas fa-bolt" style={{ color: '#A2201A' }}></i></div>
          <span className="nav-text">FLASH DEALS</span>
        </div>

        {/* Example expandable section */}
        {[
          {
            key: 'amulets',
            label: 'AMULETS',
            icon: 'fas fa-gem',
            items: [
              { to: '/category/keychains', icon: 'fas fa-key', text: 'Keychains' },
              { to: '/category/medallions', icon: 'fas fa-medal', text: 'Medallions' },
              { to: '/category/plaque', icon: 'fas fa-square', text: 'Plaque' },
              { to: '/category/talisman-card', icon: 'fas fa-id-card', text: 'Talisman Card' }
            ]
          },
          {
            key: 'feng-shui-fashion',
            label: 'FENG SHUI FASHION',
            icon: 'fas fa-tshirt',
            items: [
              { to: '/category/earrings', icon: 'fas fa-circle', text: 'Earrings' },
              { to: '/category/necklaces', icon: 'fas fa-gem', text: 'Necklaces' },
              { to: '/category/pendants', icon: 'fas fa-star', text: 'Pendants' },
              { to: '/category/rings', icon: 'fas fa-circle', text: 'Rings' },
              { to: '/category/scarves-shawls', icon: 'fas fa-tshirt', text: 'Scarves & Shawls' },
              { to: '/category/wallets', icon: 'fas fa-wallet', text: 'Wallets' }
            ]
          },
          {
            key: 'incense-space-clearing',
            label: 'INCENSE & SPACE CLEARING',
            icon: 'fas fa-fire',
            items: [
              { to: '/category/incense-holder-burner', icon: 'fas fa-fire', text: 'Incense Holder & Burner' },
              { to: '/category/incense-sticks', icon: 'fas fa-fire-alt', text: 'Incense Sticks' },
              { to: '/category/singing-bowl', icon: 'fas fa-circle-notch', text: 'Singing Bowl' },
              { to: '/category/smudge-kit', icon: 'fas fa-seedling', text: 'Smudge Kit' },
              { to: '/category/wishing-paper', icon: 'fas fa-file-alt', text: 'Wishing Paper' }
            ]
          }
        ].map(section => (
          <div className="nav-item expandable" key={section.key}>
            <div className="nav-item-header" onClick={() => handleToggleDropdown(section.key)}>
              <div className="nav-icon"><i className={section.icon} style={{ color: '#A2201A' }}></i></div>
              <span className="nav-text">{section.label}</span>
              <i className={`fas fa-chevron-right nav-arrow ${activeDropdown === section.key ? 'expanded' : ''}`}></i>
            </div>
            {activeDropdown === section.key && (
              <div className="nav-dropdown expanded">
                {section.items.map(item => (
                  <Link to={item.to} className="nav-dropdown-item" key={item.to} onClick={handleDropdownItemClick}>
                    <div className="nav-dropdown-icon"><i className={item.icon}></i></div>
                    <span className="nav-dropdown-text">{item.text}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

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
