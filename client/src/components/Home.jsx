import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Home.css';
import placeholderImages from '../assets/placeholder.js';
import Logo from '/Logo.png';
import Michael from '/Michael.png';
import NavBar from './NavBar';

// Component imports will go here

const Home = () => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = React.useRef(null);

  const zodiacSigns = [
    { name: 'RAT', image: '/Prosper-1.png' },
    { name: 'OX', image: '/Prosper-2.png' },
    { name: 'TIGER', image: '/Prosper-3.png' },
    { name: 'RABBIT', image: '/Prosper-4.png' },
    { name: 'DRAGON', image: '/Prosper-5.png' },
    { name: 'SNAKE', image: '/Prosper-6.png' },
    { name: 'HORSE', image: '/Prosper-7.png' },
    { name: 'GOAT', image: '/Prosper-8.png' },
    { name: 'MONKEY', image: '/Prosper-9.png' },
    { name: 'ROOSTER', image: '/Prosper-10.png' },
    { name: 'DOG', image: '/Prosper-11.png' },
    { name: 'PIG', image: '/Prosper-12.png' },
  ];

  const aspirations = [
    { name: 'Balance', image: '/Aspiration-1.png' },
    { name: 'Health', image: '/Aspiration-2.png' },
    { name: 'Love', image: '/Aspiration-3.png' },
    { name: 'Luck', image: '/Aspiration-4.png' },
    { name: 'Positivity', image: '/Aspiration-5.png' },
    { name: 'Protection', image: '/Aspiration-6.png' },
    { name: 'Wealth', image: '/Aspiration-7.png' },
    { name: 'Wisdom', image: '/Aspiration-8.png' },
  ];

  useEffect(() => {
    // Fetch new arrivals from API
    const fetchNewArrivals = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/products/new-arrivals');
        if (!response.ok) {
          throw new Error('Failed to fetch new arrivals');
        }
        const data = await response.json();
        setNewArrivals(data);
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNewArrivals();
  }, []);

  // Calculate discounted price
  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  // Format currency
  const formatPrice = (price) => {
    return `₱${Number(price).toFixed(2)}`;
  };

  // Scroll the carousel left or right
  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    
    const scrollWidth = carouselRef.current.scrollWidth;
    const clientWidth = carouselRef.current.clientWidth;
    const scrollAmount = direction * (clientWidth * 0.75);
    
    carouselRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  const navigateToProduct = (id) => {
    navigate(`/product/${id}`);
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
  };

  // Carousel touch/drag functionality
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  // Update active index when scrolling
  const handleScroll = () => {
    if (!carouselRef.current) return;
    
    const scrollPosition = carouselRef.current.scrollLeft;
    const scrollWidth = carouselRef.current.scrollWidth;
    const clientWidth = carouselRef.current.clientWidth;
    
    // Calculate how many indicator dots to show based on viewport capacity
    const maxScroll = scrollWidth - clientWidth;
    const scrollRatio = maxScroll > 0 ? scrollPosition / maxScroll : 0;
    
    // Fixed number of dots for better visual consistency
    const totalDots = 3;
    const newIndex = Math.min(Math.floor(scrollRatio * totalDots), totalDots - 1);
    
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  // Scroll to dot index
  const scrollToDot = (index) => {
    if (!carouselRef.current) return;
    
    const scrollWidth = carouselRef.current.scrollWidth;
    const clientWidth = carouselRef.current.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    
    // Fixed number of dots
    const totalDots = 3;
    const scrollPosition = index * (maxScroll / (totalDots - 1));
    
    carouselRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
    
    setActiveIndex(index);
  };

  // Register scroll event listener
  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', handleScroll);
      return () => carousel.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="home">
      <NavBar />
      <section className="hero-section" style={{ 
        backgroundColor: '#A2201A',
        backgroundImage: `url(/HeroBG-01-01.png)`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="hero-grid">
          <div className="hero-top-left">
            <div className="hero-content">
              {Logo && <img src={Logo} alt="Logo" className="hero-logo" />}
              <h1>MICHAEL DE MESA</h1>
              <h2>BAZI & FENG SHUI CONSULTANCY</h2>
              <p>Will give you a step-by-step guideline that will help you towards your desired</p>
              <button className="primary-button">Learn More</button>
            </div>
          </div>
          <div className="hero-top-right">
            {Michael && <img src={Michael} alt="Michael De Mesa" className="hero-image"/>}
          </div>
          <div className="hero-bottom-left">
          </div>
          <div className="hero-bottom-right">
            <div className="hero-why-consult">

              <h3>WHY CONSULT WITH MASTER MICHAEL DE MESA</h3>
              <div className="why-consult-icons">
                <div className="why-consult-icon">
                  <img src="/Icons-1.png" alt="Icon 1" />
                </div>
                <div className="why-consult-icon">
                  <img src="/Icons-2.png" alt="Icon 2" />
                </div>
                <div className="why-consult-icon">
                  <img src="/Icons-3.png" alt="Icon 3" />
                </div>
                <div className="why-consult-icon">
                  <img src="/Icons-4.png" alt="Icon 4" />
                </div>
                <div className="why-consult-icon">
                  <img src="/Icons-5.png" alt="Icon 5" />
                </div>
                <div className="why-consult-icon">
                  <img src="/Icons-6.png" alt="Icon 6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="new-arrivals">
        <div className="section-header">
          <h2>NEW ARRIVALS</h2>
          <p>Our latest additions to bring balance and harmony</p>
        </div>
        
        {loading ? (
          <div className="loading-indicator">Loading new arrivals...</div>
        ) : newArrivals.length === 0 ? (
          <div className="no-products">No new arrivals found</div>
        ) : (
          <div className="carousel-wrapper">
            <div className="carousel-container">
              <div 
                className="carousel-products" 
                id="new-arrivals-carousel"
                ref={carouselRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onScroll={handleScroll}
              >
                {newArrivals.map(product => (
                  <div 
                    key={product.id} 
                    className="carousel-product-card"
                    onClick={() => navigateToProduct(product.id)}
                  >
                    <div 
                      className="product-image" 
                      style={{ backgroundImage: `url(http://localhost:5000${product.image_url})` }}
                    ></div>
                    <h3>{product.name}</h3>
                    {product.is_flash_deal ? (
                      <div className="product-price">
                        <span className="original-price">{formatPrice(product.price)}</span>
                        <span className="discounted-price">
                          {formatPrice(calculateDiscountedPrice(product.price, product.discount_percentage))}
                        </span>
                        <span className="discount-tag">-{product.discount_percentage}%</span>
                      </div>
                    ) : (
                      <p>{formatPrice(product.price)}</p>
                    )}
                    <button 
                      className="primary-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="carousel-controls">
              <button 
                className="carousel-nav-button prev"
                onClick={() => scrollCarousel(-1)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              <button 
                className="carousel-nav-button next"
                onClick={() => scrollCarousel(1)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="categories">
        <div className="section-header">
          <h2>CATEGORIES</h2>
        </div>
        <div className="categories-grid">
          <div className="category-card">
            <div className="category-image">
              <img src="/Categories-1.png" alt="Best Sellers Icon" />
            </div>
            <h3>Best Sellers</h3>
          </div>
          <div className="category-card">
            <div className="category-image">
              <img src="/Categories-2.png" alt="Flash Deals Icon" />
            </div>
            <h3>Flash Deals</h3>
          </div>
          <div className="category-card">
            <div className="category-image">
              <img src="/Categories-3.png" alt="Books Icon" />
            </div>
            <h3>Books</h3>
          </div>
          <div className="category-card">
            <div className="category-image">
              <img src="/Categories-5.png" alt="Bracelets Icon" />
            </div>
            <h3>Amulets</h3>
          </div>
          <div className="category-card">
            <div className="category-image">
              <img src="/Categories-4.png" alt="Amulets Icon" />
            </div>
            <h3>Bracelets</h3>
          </div>
        </div>
      </section>

      {/* 2025 Prosper Guide - Updated Structure */}
      <section className="prosper-guide-section">
        <div className="section-header prosper-header">
          <h2>2025 PROSPER GUIDE</h2> 
          <p>Career, Health, Love, & Wealth</p>
        </div>
        <div className="zodiac-icons-container">
          {zodiacSigns.map((sign) => (
            <Link to={`/prosper-guide/${sign.name.toLowerCase()}`} key={sign.name} className="zodiac-item">
              <img src={sign.image} alt={sign.name} className="zodiac-icon" />
              <p className="zodiac-name">{sign.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by Aspiration */}
      <section className="shop-aspirations">
        <div className="section-header">
          <h2>SHOP BY ASPIRATION</h2>
          <p>Find products aligned with your life goals</p>
        </div>
        <div className="aspirations-grid">
          {aspirations.map((item) => (
            <div key={item.name} className="aspiration-card">
              <div className="aspiration-icon">
                 <img src={item.image} alt={`${item.name} Icon`} />
              </div>
              <h3>{item.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Blog Section */}
      <section className="blog-section">
        <div className="section-header">
          <h2>BLOG</h2>
        </div>
        <div className="blog-grid">
          <div className="blog-card">
            <div className="blog-image" style={{ backgroundImage: `url(${placeholderImages.blogOffice})` }}></div>
            <div className="blog-content">
              <h3>Balance Your Home Office for Success</h3>
              <p>Discover how proper Feng Shui can boost productivity and success...</p>
              <a href="#">Read More</a>
            </div>
          </div>
          <div className="blog-card">
            <div className="blog-image" style={{ backgroundImage: `url(${placeholderImages.blogWater})` }}></div>
            <div className="blog-content">
              <h3>Water Elements for Wealth Attraction</h3>
              <p>Learn how water features can enhance your wealth sector...</p>
              <a href="#">Read More</a>
            </div>
          </div>
          <div className="blog-card">
            <div className="blog-image" style={{ backgroundImage: `url(${placeholderImages.blogBedroom})` }}></div>
            <div className="blog-content">
              <h3>Bedroom Feng Shui for Better Sleep</h3>
              <p>Transform your bedroom into a sanctuary for rest and rejuvenation...</p>
              <a href="#">Read More</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>FAQ</h3>
            <ul>
              <li><a href="#">Delivery</a></li>
              <li><a href="#">Return/Exchange</a></li>
              <li><a href="#">Order/Cancellation</a></li>
              <li><a href="#">Payment</a></li>
              <li><a href="#">Product Availability</a></li>
              <li><a href="#">Gift Wrapping Services</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>VISIT US</h3>
            <ul>
              <p>Feng Shui by Pakbet TV</p>
              <p>Unit 1004 Cityland Shaw Tower</p>
              <p>Corner St. Francis, Shaw Blvd.</p>
              <p>Mandaluyong City, Philippines</p>
              <p>Hours</p>
              <p>Monday - Sunday</p>
              <p>8:00 AM - 5:00 PM</p>
              <p>Public Holidays - CLOSED</p>
            </ul>
          </div>
          <div className="footer-section">
            <h3>FOLLOW US</h3>
            <ul>
              <p>Facebook</p>
              <p>Instagram</p>
              <p>YouTube</p>
              <p>NEED HELP?</p>
              <p>admin@pakbettv.com</p>
              <p>09123-12312-12123</p>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>
          <p>COPYRIGHT 2025 FENG SHUI BY PAKBET TV. ALL RIGHTS RESERVED.</p>
          </div>
          <div>
            <p>Terms of Use</p>
            <p>Privacy Policy</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 