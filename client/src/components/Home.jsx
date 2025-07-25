import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import './Home.css';
import NavBar from './NavBar';
import Footer from './Footer';
import API_BASE_URL from '../config';
import ProductCard from './common/ProductCard';
import axios from 'axios';
import Swal from 'sweetalert2';
import './Home/HomeHeroSection.css';
import OurService from './Home/OurService';
import DailyHoroScopeSection from './Home/DailyHoroScopeSection';
import './Home/Banner.css'; // Import the CSS for the banner
import Banner from './Home/Banner';
import DailyVideo from './Home/DailyVideo';

const constructUrl = (baseUrl, path) => {
  const defaultImageUrl = '/images/default-placeholder.png'; 
  if (!path) return defaultImageUrl; 
  if (!baseUrl) {
    return path.startsWith('/') ? path : '/' + path;
  }
  return path.startsWith('/') ? baseUrl + path : baseUrl + '/' + path;
};

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const navigate = useNavigate();
  const { } = useCart();
  
  // Use the optimized new arrivals query
  const { getNewArrivals } = useProducts();
  const { 
    data: newArrivals = [], 
    isLoading: newArrivalsLoading,
    error: newArrivalsError 
  } = getNewArrivals;

  // Add carousel data
  const carouselData = [
    {
      title: "FENG SHUI ESSENTIALS",
      description: "Transform your space with our authentic Feng Shui collection by Feng Shui Expert Michael De Mesa. Find the perfect items to enhance harmony and balance in your life.",
      buttonText: "Shop Collection",
      buttonLink: "/shop",
      leftBackground: "url('/Carousel-1.jpg')",
      rightColor: "linear-gradient(135deg, #db1730 100%)",
      side: "left"
    },
    {
      title: "ZODIAC COLLECTION",
      description: "Discover items tailored to your zodiac sign. Enhance your luck and prosperity with our specially curated zodiac items.",
      buttonText: "Shop Zodiac Items",
      buttonLink: "/shop?category=zodiac",
      leftColor: "linear-gradient(135deg, #db1730 100%)",
      rightBackground: "url('/Zodiac-1.jpg')",
      side: "right"
    },
    {
      title: "FENG SHUI WISDOM BLOG",
      description: "Explore our collection of insightful articles on Feng Shui principles, home harmony, and spiritual wellness. Learn from expert guidance and real-life applications.",
      buttonText: "Read Blog Posts",
      buttonLink: "/blog",
      leftBackground: "url('/Carousel-2.jpg')",
      rightColor: "linear-gradient(135deg, #db1730 100%)",
      side: "left"
    },
    {
      title: "SPECIAL OFFERS",
      description: "Take advantage of our limited-time deals on selected Feng Shui items. Transform your space while saving.",
      buttonText: "View Deals",
      buttonLink: "/shop?category=flash-deals",
      leftColor: "linear-gradient(135deg, #db1730 100%)",
      rightBackground: "url('/Carousel-1.jpg')",
      side: "right"
    }
  ];

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
    setBlogLoading(true);
    axios.get(`/api/cms/blogs`)
      .then(res => {
        if (res.data.length === 0) {
          Swal.fire("No Blog Posts Found", "Please check back later.", "info");
        }
        setBlogs(res.data);
      })
      .catch(err => {
        console.error("Error fetching blogs:", err);
        Swal.fire("Error", "Failed to fetch blogs", "error");
      })
      .finally(() => {
        setBlogLoading(false);
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === 3 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? 3 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === 3 ? 0 : prev + 1));
  };

  const handleDotClick = (index) => {
    setCurrentSlide(index);
  };

const renderNewArrivals = () => (
  <section className="home-new-arrivals">
    {newArrivalsLoading || newArrivalsError || newArrivals.length > 0 ? (
      <>
        <div className="home-section-header">
          <h2>New Arrivals</h2>
        </div>

        {newArrivalsLoading ? (
          <div className="home-new-arrivals-loading-container">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : newArrivalsError ? (
          <div className="error-message">{newArrivalsError.message}</div>
        ) : (
          <div className="home-new-arrivals-grid">
            {newArrivals.slice(0, 10).map(product => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}

        <Link to="/shop" className="view-all-btn">View All Products</Link>
      </>
    ) : null}
  </section>
);
  return (
    <div className="home-page">
           <NavBar />

<section className="home-hero-section">
  {/* Background video */}
  <video
    className="video-background"
    src="/HomeHeroVideo.mp4"
    autoPlay
    muted
    loop
    playsInline
  />

  {/* Gradient overlay */}
  <div className="gradient-overlay"></div>

  {/* Foreground content */}
  <div className="hero-content">
    <main className="hero-container" role="main" aria-label="Simplifying Feng Shui">

      {/* Left content */}
      <div className="text-content">
        <h1 className="headline">
          <span className="yellow-bold">Simplifying</span><br />
          <span className="white-bold">Feng Shui</span><br />
          <span className="yellow-bold">for everyone.</span>
        </h1>

        <section className="buttons" aria-label="Primary actions">
          <Link to="/contact"  style={{ textDecoration: 'none' }} className="btn-ask">
            Ask <strong>Master Michael</strong> now
          </Link>
        <Link to="/shop" style={{ textDecoration: 'none' }} className="btn-shop">
          Go to Shop
        </Link>
        </section>

        <section className="features" aria-label="Key Features and Benefits">
          <article className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <path d="M12 2L15 8H9L12 2Z" />
              <circle cx="12" cy="16" r="6" />
            </svg>
            Expert<br />Guidance
          </article>
          <article className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4z" />
              <path d="M4 9h16" />
            </svg>
            Personalized<br />Analysis
          </article>
          <article className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
            </svg>
            Realistic<br />Solution
          </article>
          <article className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 0 1 10 10" />
              <path d="M2 12a10 10 0 0 0 10 10" />
            </svg>
            Modern<br />Practice
          </article>
          <article className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <path d="M3 12h18M12 3v18" />
            </svg>
            Life<br />Harmony
          </article>
          <article className="feature-item">
            <svg className="feature-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Timely<br />Advice
          </article>
        </section>
      </div>

      {/* Right picture */}
      <div className="image-container">
        <img src="/MasterMichael.png" alt="Master Michael" />
      </div>

    </main>
  </div>
</section>
      {renderNewArrivals()}
<OurService />
<DailyHoroScopeSection />
<DailyVideo />
      <section className="home-prosper-guide-section">
        <div className="home-section-header home-prosper-header">
          <h2>2025 PROSPER GUIDE</h2>
          <p>Career, Health, Love, & Wealth</p>
        </div>
        <div className="home-zodiac-icons-container">
          {zodiacSigns.map(sign => (
            <Link to={`/prosper-guide/${sign.name.toLowerCase()}`} key={sign.name} className="home-zodiac-item">
              <img src={sign.image} alt={sign.name} className="home-zodiac-icon" />
              <p className="home-zodiac-name">{sign.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-shop-aspirations">
        <div className="home-section-header-aspirations">
          <h2>SHOP BY ASPIRATION</h2>
          <p>Find products aligned with your life goals</p>
        </div>
        <div className="home-aspirations-grid">
          {aspirations.map(item => (
            <Link to="/shop" key={item.name} className="home-aspiration-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="home-aspiration-icon">
                <img src={item.image} alt={`${item.name} Icon`} />
              </div>
              <h3>{item.name}</h3>
            </Link>
          ))}
        </div>
      </section>
  <Footer forceShow={false} />
    </div>
  );
};

export default Home;
