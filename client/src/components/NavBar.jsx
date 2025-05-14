import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './NavBar.css';

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ products: [], blogs: [], zodiacs: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { user, logout, loggingOut } = useAuth();
  const { getTotalCount } = useCart();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isShopPage = location.pathname === '/shop';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({ products: [], blogs: [], zodiacs: [] });
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    try {
      // Search products
      const productsResponse = await fetch(`/api/products/search?query=${encodeURIComponent(query)}`);
      const products = await productsResponse.json();

      // Search blogs
      const blogsResponse = await fetch(`/api/cms/blogs/search?query=${encodeURIComponent(query)}`);
      const blogs = await blogsResponse.json();

      // Search zodiacs
      const zodiacsResponse = await fetch(`/api/cms/zodiacs?search=${encodeURIComponent(query)}`);
      const zodiacs = await zodiacsResponse.json();

      setSearchResults({
        products: products || [],
        blogs: blogs || [],
        zodiacs: zodiacs || []
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ products: [], blogs: [], zodiacs: [] });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };
  const handleLogout = () => {
    setDropdownOpen(false); 
    logout(); 
  };
  const isHomePage = location.pathname === '/';
  const navClassName = `navbar-navbar ${
    !isHomePage || scrolled ? 'red' : 'transparent' 
  } ${scrolled ? 'scrolled' : ''}`;
  const handleSearchResultClick = (item, type) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    
    switch (type) {
      case 'product':
        navigate(`/product/${item.product_id}`);
        break;
      case 'blog':
        navigate(`/blog/${item.blogID}`);
        break;
      case 'zodiac':
        navigate(`/prosper-guide/${item.zodiacID.toLowerCase()}`);
        break;
      default:
        break;
    }
  };
  const renderSearchResults = () => {
    if (!showSearchDropdown) return null;
    
    return (
      <div className="search-dropdown">
        {searchResults.zodiacs.length > 0 && (
          <div className="search-section">
            <div className="search-section-header">Zodiac Guides</div>
            {searchResults.zodiacs.map((zodiac) => (
              <div
                key={zodiac.zodiacID}
                className="search-result-item"
                onClick={() => handleSearchResultClick(zodiac, 'zodiac')}
              >
                <div className="search-result-content">
                  <div className="search-result-title">{zodiac.zodiacID}</div>
                  <div className="search-result-subtitle">Prosper Guide</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {searchResults.products.length > 0 && (
          <div className="search-section">
            <div className="search-section-header">Products</div>
            {searchResults.products.map((product) => (
              <div
                key={product.product_id}
                className="search-result-item"
                onClick={() => handleSearchResultClick(product, 'product')}
              >
                {product.image && (
                  <div className="search-result-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                )}
                <div className="search-result-content">
                  <div className="search-result-title">{product.name}</div>
                  <div className="search-result-price">₱{product.price}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {searchResults.blogs.length > 0 && (
          <div className="search-section">
            <div className="search-section-header">Blog Posts</div>
            {searchResults.blogs.map((blog) => (
              <div
                key={blog.blogID}
                className="search-result-item"
                onClick={() => handleSearchResultClick(blog, 'blog')}
              >
                {blog.cover_image && (
                  <div className="search-result-image">
                    <img src={blog.cover_image} alt={blog.title} />
                  </div>
                )}
                <div className="search-result-content">
                  <div className="search-result-title">{blog.title}</div>
                  <div className="search-result-subtitle">{blog.category}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {searchResults.products.length === 0 && 
         searchResults.blogs.length === 0 && 
         searchResults.zodiacs.length === 0 && (
          <div className="search-no-results">
            No results found for "{searchQuery}"
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      <nav className={navClassName}>
        <div className="navbar-navbar-container">
          <div className="navbar-navbar-logo">
            <Link to="/" className="navbar-logo-link">
              <div className="navbar-logo-text">
                <h3>MICHAEL DE MESA</h3>
                <p>BAZI & FENG SHUI CONSULTANCY</p>
              </div>
            </Link>
          </div>
          <ul className="navbar-navbar-menu">
            <li className="navbar-navbar-item">
              <Link to="/" className="navbar-navbar-link">Home</Link>
            </li>
            <li className="navbar-navbar-item">
              <Link to="/shop" className="navbar-navbar-link">Shop</Link>
            </li>
            <li className="navbar-navbar-item">
              <Link to="#" className="navbar-navbar-link">Consultations</Link>
            </li>
            <li className="navbar-navbar-item">
              <Link to="/horoscope" className="navbar-navbar-link">Horoscope</Link>
            </li>
            <li className="navbar-navbar-item">
              <Link to="/blog" className="navbar-navbar-link">Blogs</Link>
            </li>
            <li className="navbar-navbar-item">
              <Link to="/faqs" className="navbar-navbar-link">FAQs</Link>
            </li>
            <li className="navbar-navbar-item">
              <Link to="/contact" className="navbar-navbar-link">Contact Us</Link>
            </li>
            <li className="navbar-navbar-item">
              <Link to="/blog/:slug" className="navbar-navbar-link">Free Tools</Link>
            </li>
          </ul>
          <div className="navbar-navbar-actions">
            <div className="navbar-search-container" ref={searchRef}>
              <div className="navbar-search-bar">
                <input
                  type="text"
                  placeholder="Search for a product"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) {
                      setShowSearchDropdown(true);
                    }
                  }}
                />
                <button 
                  className="navbar-search-button" 
                  aria-label="Search"
                  onClick={() => handleSearch(searchQuery)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>
              {isSearching && (
                <div className="search-loading">
                  Searching...
                </div>
              )}
              {renderSearchResults()}
            </div>
            <div className="navbar-navbar-buttons">
              {user ? (
                <div className="navbar-user-menu" ref={dropdownRef}>
                  <button className="navbar-profile-button" onClick={toggleDropdown} disabled={loggingOut}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>{user.firstName}  {user.lastName}</span>
                    <svg className="navbar-dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="navbar-dropdown-menu">
                      <Link to="/account" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>My Account</span>
                      </Link>
                      <Link to="/purchases" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                          <line x1="3" y1="6" x2="21" y2="6"></line>
                          <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        <span>My Purchase</span>
                      </Link>
                      <button onClick={handleLogout} className="navbar-dropdown-item navbar-logout-item" disabled={loggingOut}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="navbar-auth-buttons">
                  <Link to="/login" className="navbar-login-button">Login</Link>
                  <Link to="/signup" className="navbar-signup-button">Sign Up</Link>
                </div>
              )}
              <button 
                className="navbar-cart-button"
                disabled={loggingOut}
                onClick={() => navigate('/cart')}
              >
                <span>Cart ({getTotalCount()})</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="navbar-cart-icon">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavBar; 