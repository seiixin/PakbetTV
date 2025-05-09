import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Home.css';
import placeholderImages from '../assets/placeholder.js';
import Logo from '/Logo.png';
import Michael from '/Michael.png';
import NavBar from './NavBar';
import Footer from './Footer';
import LoadingSpinner from './common/LoadingSpinner';
import API_BASE_URL from '../config';
import ProductCard from './common/ProductCard';

const constructUrl = (baseUrl, path) => {
  const defaultImageUrl = '/images/default-placeholder.png'; 
  if (!path) return defaultImageUrl; 
  if (!baseUrl) {
    return path.startsWith('/') ? path : '/' + path;
  }
  else {
    return path.startsWith('/') ? baseUrl + path : baseUrl + '/' + path;
  }
};

const Home = () => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { } = useCart();
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
  const homeCategories = [
    { name: 'Best Sellers', image: '/Categories-1.png', filterId: 'best-sellers' },
    { name: 'Flash Deals', image: '/Categories-2.png', filterId: 'flash-deals' },
    { name: 'Books', image: '/Categories-3.png', filterId: 'books' },
    { name: 'Amulets', image: '/Categories-5.png', filterId: 'amulets' }, 
    { name: 'Bracelets', image: '/Categories-4.png', filterId: 'bracelets' } 
  ];
  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/products?limit=1000`); 
        if (!response.ok) {
          throw new Error('Failed to fetch products for new arrivals');
        }
        const data = await response.json();
        const allProducts = Array.isArray(data?.products) ? data.products : [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const filteredArrivals = allProducts.filter(product => {
            const createdDate = new Date(product.created_at);
            return createdDate > thirtyDaysAgo;
        });
        const limitedArrivals = filteredArrivals.slice(0, 10);
        console.log(`Found ${limitedArrivals.length} new arrivals (limited to 10).`);
        setNewArrivals(limitedArrivals);
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
        setError('Error fetching new arrivals');
        setNewArrivals([]); 
      } finally {
        setLoading(false);
      }
    };
    fetchNewArrivals();
  }, []);
  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };
  const formatPrice = (price) => {
    return `₱${Number(price).toFixed(2)}`;
  };
  const formatItemsSold = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k sold`;
    }
    return `${count} sold`;
  };
  const navigateToProduct = (id) => {
    navigate(`/product/${id}`);
  };
  const renderNewArrivals = () => {
    return (
      <section className="home-new-arrivals">
        <div className="home-section-header">
          <h2>New Arrivals</h2>
        </div>
        
        {loading ? (
          <div className="home-new-arrivals-loading-container">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="home-new-arrivals-grid">
            {newArrivals.map(product => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
        
        <Link to="/shop" className="view-all-btn">View All Products</Link>
      </section>
    );
  };
  return (
    <div className="home-page">
      <NavBar />
      <section className="home-hero-section" style={{ 
        backgroundColor: '#A2201A',
        backgroundImage: `url(/HeroBG-01-01.png)`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="home-hero-grid">
          <div className="home-hero-top-left">
            <div className="home-hero-content">
              {Logo && <img src={Logo} alt="Logo" className="home-hero-logo" />}
              <h1>MICHAEL DE MESA</h1>
              <h2>BAZI & FENG SHUI CONSULTANCY</h2>
              <p>Will give you a step-by-step guideline that will help you towards your desired</p>
              <button className="home-primary-button">Learn More</button>
            </div>
          </div>
          <div className="home-hero-top-right">
            {Michael && <img src={Michael} alt="Michael De Mesa" className="home-hero-image"/>}
          </div>
          <div className="home-hero-bottom-left">
          </div>
          <div className="home-hero-bottom-right">
            <div className="home-hero-why-consult">
              <h3>WHY CONSULT WITH MASTER MICHAEL DE MESA</h3>
              <div className="home-why-consult-icons">
                <div className="home-why-consult-icon">
                  <img src="/Icons-1.png" alt="Icon 1" />
                </div>
                <div className="home-why-consult-icon">
                  <img src="/Icons-2.png" alt="Icon 2" />
                </div>
                <div className="home-why-consult-icon">
                  <img src="/Icons-3.png" alt="Icon 3" />
                </div>
                <div className="home-why-consult-icon">
                  <img src="/Icons-4.png" alt="Icon 4" />
                </div>
                <div className="home-why-consult-icon">
                  <img src="/Icons-5.png" alt="Icon 5" />
                </div>
                <div className="home-why-consult-icon">
                  <img src="/Icons-6.png" alt="Icon 6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {renderNewArrivals()}
      <section className="home-categories">
        <div className="home-section-header">
          <h2>CATEGORIES</h2>
        </div>
        <div className="home-categories-grid">
          {homeCategories.map(category => (
            <Link 
              to={`/shop?category=${category.filterId}`} 
              key={category.filterId} 
              className="home-category-card"
            >
              <div className="home-category-image">
                <img src={category.image} alt={`${category.name} Icon`} />
              </div>
              <h3>{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>
      {}
      <section className="home-prosper-guide-section">
        <div className="home-section-header home-prosper-header">
          <h2>2025 PROSPER GUIDE</h2> 
          <p>Career, Health, Love, & Wealth</p>
        </div>
        <div className="home-zodiac-icons-container">
          {zodiacSigns.map((sign) => (
            <Link to={`/prosper-guide/${sign.name.toLowerCase()}`} key={sign.name} className="home-zodiac-item">
              <img src={sign.image} alt={sign.name} className="home-zodiac-icon" />
              <p className="home-zodiac-name">{sign.name}</p>
            </Link>
          ))}
        </div>
      </section>
      {}
      <section className="home-shop-aspirations">
        <div className="home-section-header">
          <h2>SHOP BY ASPIRATION</h2>
          <p>Find products aligned with your life goals</p>
        </div>
        <div className="home-aspirations-grid">
          {aspirations.map((item) => (
            <div key={item.name} className="home-aspiration-card">
              <div className="home-aspiration-icon">
                 <img src={item.image} alt={`${item.name} Icon`} />
              </div>
              <h3>{item.name}</h3>
            </div>
          ))}
        </div>
      </section>
      {}
      <section className="home-blog-section">
        <div className="home-section-header">
          <h2>BLOG</h2>
        </div>
        <div className="home-blog-grid">
          <div className="home-blog-card">
            <div className="home-blog-image" style={{ backgroundImage: `url(${placeholderImages.blogOffice})` }}></div>
            <div className="home-blog-content">
              <h3>Balance Your Home Office for Success</h3>
              <p>Discover how proper Feng Shui can boost productivity and success...</p>
              <a href="#">Read More</a>
            </div>
          </div>
          <div className="home-blog-card">
            <div className="home-blog-image" style={{ backgroundImage: `url(${placeholderImages.blogWater})` }}></div>
            <div className="home-blog-content">
              <h3>Water Elements for Wealth Attraction</h3>
              <p>Learn how water features can enhance your wealth sector...</p>
              <a href="#">Read More</a>
            </div>
          </div>
          <div className="home-blog-card">
            <div className="home-blog-image" style={{ backgroundImage: `url(${placeholderImages.blogBedroom})` }}></div>
            <div className="home-blog-content">
              <h3>Bedroom Feng Shui for Better Sleep</h3>
              <p>Transform your bedroom into a sanctuary for rest and rejuvenation...</p>
              <a href="#">Read More</a>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};
export default Home; 