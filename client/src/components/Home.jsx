import React from 'react';
import './Home.css';
import placeholderImages from '../assets/placeholder.js';
import Logo from '/Logo.png';
import Michael from '/Michael.png';
import NavBar from './NavBar';

// Component imports will go here

const Home = () => {
  return (
    <div className="home">
      <NavBar />
      
      {/* Hero Section */}
      <section className="hero-section" style={{ 
        backgroundColor: '#A2201A',
        backgroundImage: `url(/HeroBG-01-01.png)`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="hero-left">
          <div className="hero-content">
            {Logo && <img src={Logo} alt="Logo" className="hero-logo" />}
            <h1>MICHAEL DE MESA</h1>
            <h2>BAZI & FENG SHUI CONSULTANCY</h2>
            <p>Will give you a step-by-step guideline that will help you towards your desired outcome"</p>
            <button className="primary-button">Learn More</button>
          </div>
        </div>
        <div className="hero-right">
          {Michael && <img src={Michael} alt="Michael De Mesa"  className='hero-image'/>}
        </div>
      </section>
      <section className="new-arrivals">
        <div className="section-header">
          <h2>New Arrivals</h2>
          <p>Our latest additions to bring balance and harmony</p>
        </div>
        <div className="products-grid">
          <div className="product-card">
            <div className="product-image" style={{ backgroundImage: `url(${placeholderImages.prosperityBuddha})` }}></div>
            <h3>Prosperity Buddha</h3>
            <p>$89.99</p>
            <button className="secondary-button">Add to Cart</button>
          </div>
          <div className="product-card">
            <div className="product-image" style={{ backgroundImage: `url(${placeholderImages.crystalWealthBowl})` }}></div>
            <h3>Crystal Wealth Bowl</h3>
            <p>$129.99</p>
            <button className="secondary-button">Add to Cart</button>
          </div>
          <div className="product-card">
            <div className="product-image" style={{ backgroundImage: `url(${placeholderImages.bambooFlute})` }}></div>
            <h3>Bamboo Flute</h3>
            <p>$45.99</p>
            <button className="secondary-button">Add to Cart</button>
          </div>
          <div className="product-card">
            <div className="product-image" style={{ backgroundImage: `url(${placeholderImages.redAgateBracelet})` }}></div>
            <h3>Red Agate Bracelet</h3>
            <p>$39.99</p>
            <button className="secondary-button">Add to Cart</button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories">
        <div className="section-header">
          <h2>Categories</h2>
          <p>Find the perfect Feng Shui elements for your space</p>
        </div>
        <div className="categories-grid">
          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${placeholderImages.waterElements})` }}></div>
            <h3>Water Elements</h3>
          </div>
          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${placeholderImages.woodElements})` }}></div>
            <h3>Wood Elements</h3>
          </div>
          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${placeholderImages.fireElements})` }}></div>
            <h3>Fire Elements</h3>
          </div>
          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${placeholderImages.earthElements})` }}></div>
            <h3>Earth Elements</h3>
          </div>
          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${placeholderImages.metalElements})` }}></div>
            <h3>Metal Elements</h3>
          </div>
        </div>
      </section>

      {/* 2025 Prosper Guide */}
      <section className="prosper-guide">
        <div className="guide-content">
          <div className="guide-text">
            <h2>2025 Prosper Guide</h2>
            <p>Navigate the Year of the Snake with our exclusive Feng Shui guide. Learn how to optimize your space for maximum prosperity and harmony.</p>
            <button className="primary-button">Get Your Guide</button>
          </div>
          <div className="guide-image" style={{ backgroundImage: `url(${placeholderImages.prosperGuide})` }}></div>
        </div>
      </section>

      {/* Shop by Aspiration */}
      <section className="shop-aspirations">
        <div className="section-header">
          <h2>Shop by Aspiration</h2>
          <p>Find products aligned with your life goals</p>
        </div>
        <div className="aspirations-grid">
          <div className="aspiration-card">
            <div className="aspiration-icon" style={{ backgroundImage: `url(${placeholderImages.wealthIcon})` }}></div>
            <h3>Wealth & Prosperity</h3>
          </div>
          <div className="aspiration-card">
            <div className="aspiration-icon" style={{ backgroundImage: `url(${placeholderImages.loveIcon})` }}></div>
            <h3>Love & Relationships</h3>
          </div>
          <div className="aspiration-card">
            <div className="aspiration-icon" style={{ backgroundImage: `url(${placeholderImages.careerIcon})` }}></div>
            <h3>Career & Success</h3>
          </div>
          <div className="aspiration-card">
            <div className="aspiration-icon" style={{ backgroundImage: `url(${placeholderImages.healthIcon})` }}></div>
            <h3>Health & Wellness</h3>
          </div>
          <div className="aspiration-card">
            <div className="aspiration-icon" style={{ backgroundImage: `url(${placeholderImages.familyIcon})` }}></div>
            <h3>Family Harmony</h3>
          </div>
          <div className="aspiration-card">
            <div className="aspiration-icon" style={{ backgroundImage: `url(${placeholderImages.knowledgeIcon})` }}></div>
            <h3>Knowledge & Wisdom</h3>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="blog-section">
        <div className="section-header">
          <h2>Feng Shui Insights</h2>
          <p>Learn from our experts about ancient wisdom for modern living</p>
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
            <h3>About Us</h3>
            <p>Authentic Feng Shui products curated by masters to enhance your life's harmony and balance.</p>
          </div>
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="#">Home</a></li>
              <li><a href="#">Shop</a></li>
              <li><a href="#">Categories</a></li>
              <li><a href="#">2025 Prosper Guide</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Customer Service</h3>
            <ul>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Shipping & Returns</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Newsletter</h3>
            <p>Subscribe to receive Feng Shui tips and exclusive offers.</p>
            <form className="newsletter-form">
              <input type="email" placeholder="Your email address" />
              <button type="submit" className="primary-button">Subscribe</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Feng Shui E-Commerce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home; 