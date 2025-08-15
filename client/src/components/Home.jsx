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
import DailyHoroScopeSection from './DailyHoroScopeSection';
import './Home/Banner.css'; // Import the CSS for the banner
import Banner from './Home/Banner';
import DailyVideo from './Home/DailyVideo';
import Ads from "./Home/ads";

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
  { name: 'RAT', image: '/Prosper-1.png', frontImage: '/2025ProsperGuide/RatFront.png' },
  { name: 'OX', image: '/Prosper-2.png', frontImage: '/2025ProsperGuide/OxFront.png' },
  { name: 'TIGER', image: '/Prosper-3.png', frontImage: '/2025ProsperGuide/TigerFront.png' },
  { name: 'RABBIT', image: '/Prosper-4.png', frontImage: '/2025ProsperGuide/RabbitFront.png' },
  { name: 'DRAGON', image: '/Prosper-5.png', frontImage: '/2025ProsperGuide/DragonFront.png' },
  { name: 'SNAKE', image: '/Prosper-6.png', frontImage: '/2025ProsperGuide/SnakeFront.png' },
  { name: 'HORSE', image: '/Prosper-7.png', frontImage: '/2025ProsperGuide/HorseFront.png' },
  { name: 'GOAT', image: '/Prosper-8.png', frontImage: '/2025ProsperGuide/GoatFront.png' },
  { name: 'MONKEY', image: '/Prosper-9.png', frontImage: '/2025ProsperGuide/MonkeyFront.png' },
  { name: 'ROOSTER', image: '/Prosper-10.png', frontImage: '/2025ProsperGuide/RoosterFront.png' },
  { name: 'DOG', image: '/Prosper-11.png', frontImage: '/2025ProsperGuide/DogFront.png' },
  { name: 'PIG', image: '/Prosper-12.png', frontImage: '/2025ProsperGuide/PigFront.png' },
];

const aspirations = [
  { name: "Balance", icon: "/AspirationImg/1balance.html" },
  { name: "Health", icon: "/AspirationImg/2health.html" },
  { name: "Prosperity", icon: "/AspirationImg/3love.html" },
  { name: "Love", icon: "/AspirationImg/4luck.html" },
  { name: "Spirituality", icon: "/AspirationImg/5box.html" },
  { name: "Protection", icon: "/AspirationImg/6protection.html" },
    { name: "Wealth", icon: "/AspirationImg/7wealth.html" },
      { name: "Wisdom", icon: "/AspirationImg/8wisdom.html" },

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
        {newArrivalsLoading ? (
          <div className="home-new-arrivals-loading-container">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : newArrivalsError ? (
          <div className="error-message">{newArrivalsError.message}</div>
        ) : (
          <div className="ticker-container">
            <div className="ticker-track">
              {[...newArrivals, ...newArrivals] // duplicate para seamless
                .slice(0, 20) // twice ng 10 products
                .map((product, index) => (
                  <div className="ticker-item" key={index}>
                    <ProductCard product={product} />
                  </div>
                ))}
            </div>
          </div>
        )}
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
        id="video1"
        className="video-background"
        src="/HomeHeroVideo.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Gradient overlay */}
      <div className="gradient-overlay"></div>
      
      {/* Foreground content - Fixed structure */}
      <div className="hero-content-wrapper">
<div className="hero-container">
  {/* Left Text Content */}
  <div className="text-content">
    <h1 className="headline">
      <span className="yellow-bold">Simplifying</span><br />
      <span className="white-bold">Feng Shui</span><br />
      <span className="yellow-bold">for everyone.</span>
    </h1>

    <section className="buttons" aria-label="Primary actions">
      <a href="/contact" className="btn-ask">
        Ask <strong>Master Michael</strong> now
      </a>
      <a href="/shop" className="btn-shop">
        Go to 
        <span className="text-white"> Shop</span>
      </a>
    </section>

    <section className="features" aria-label="Key Features and Benefits">
      <article className="feature-item">
        <img src="/cleaned_icon_1.png" alt="Expert Guidance" className="feature-icon" />
        <br />
        International<br />Feng Shui <br />Affiliate <br />Member
      </article>
      <article className="feature-item">
        <img src="/cleaned_icon_2.png" alt="Personalized Analysis" className="feature-icon" />
        <br />  
        Realistic<br />Solution
      </article>
      <article className="feature-item">
        <img src="/cleaned_icon_3.png" alt="Realistic Solution" className="feature-icon" />
        <br />
        Over 96%<br />Customer<br />Satisfaction
      </article>
      <article className="feature-item">
        <img src="/cleaned_icon_4.png" alt="Modern Practice" className="feature-icon" />
        <br />
        Expert<br />Team
      </article>
      <article className="feature-item">
        <img src="/cleaned_icon_5.png" alt="Life Harmony" className="feature-icon" />
        <br />
        Reasonable<br />Pricing
      </article>
      <article className="feature-item">
        <img src="/cleaned_icon_6.png" alt="Timely Advice" className="feature-icon" />
        <br />
        Comprehensive<br />Advices
      </article>
    </section>
  </div>


          {/* Bottom-right Image */}
          <div className="image-container">
            <img src="/MasterMichaelYellowBG.png" alt="Master Michael" />
          </div>
        </div>
      </div>
    </section>
     <Ads />
<OurService />
<DailyHoroScopeSection />
<DailyVideo />
      {/* PROSPER GUIDE with hover flip */}
      <section className="home-prosper-guide-section">
        <div className="home-section-header home-prosper-header">
          <h2>2025 Prosper Guide</h2>
          <p>Career, Health, Love, and Wealth</p>
        </div>
        <div className="home-zodiac-icons-container">
          {zodiacSigns.map((sign) => (
            <Link
              to={`/prosper-guide/${sign.name.toLowerCase()}`}
              key={sign.name}
              className="home-zodiac-item"
            >
              <div className="zodiac-flip-card">
                <div className="zodiac-flip-inner">
                  <img src={sign.image} alt={sign.name} className="zodiac-flip-front" />
                  <img
                    src={sign.frontImage}
                    alt={`${sign.name} Front`}
                    className="zodiac-flip-back"
                  />
                </div>
              </div>
              <p className="home-zodiac-name">{sign.name}</p>
            </Link>
          ))}
        </div>
      </section>

<section className="home-shop-aspirations">
  <div className="home-section-header-aspirations">
    <h2>Shop by Aspiration</h2>
    <p>Find products aligned with your life goals</p>
  </div>

  <div className="home-aspirations-grid">
    {aspirations.map((item, index) => (
      <a href="/shop" className="home-aspiration-card" key={index} style={{ textDecoration: 'none' }}>        <div className="home-aspiration-icon">
          <iframe
            src={item.icon}
            title={item.name}
            width="100"
            height="100"
            allowTransparency={true}
            style={{
              border: "none",
              backgroundColor: "transparent",
            }}
          />
        </div>
        <h3>{item.name}</h3>
      </a>
    ))}
  </div>
</section>

  <Footer forceShow={false} />
    </div>
  );
};

export default Home;
