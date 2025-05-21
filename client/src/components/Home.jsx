import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Home.css';
import NavBar from './NavBar';
import Footer from './Footer';
import API_BASE_URL from '../config';
import ProductCard from './common/ProductCard';
import axios from 'axios';
import Swal from 'sweetalert2';


const constructUrl = (baseUrl, path) => {
  const defaultImageUrl = '/images/default-placeholder.png'; 
  if (!path) return defaultImageUrl; 
  if (!baseUrl) {
    return path.startsWith('/') ? path : '/' + path;
  }
  return path.startsWith('/') ? baseUrl + path : baseUrl + '/' + path;
};

const Home = () => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [blogLoading, setBlogLoading] = useState(true);

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
        const response = await fetch(`${API_BASE_URL}/api/products?limit=20`);
        if (!response.ok) {
          throw new Error('Failed to fetch products for new arrivals');
        }
        const data = await response.json();
        const allProducts = Array.isArray(data?.products) ? data.products : [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const filteredArrivals = allProducts.filter(product => new Date(product.created_at) > thirtyDaysAgo);
        setNewArrivals(filteredArrivals.slice(0, 10));
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

  const renderNewArrivals = () => (
    <section className="home-new-arrivals">
      <div className="home-section-header">
        <h2>New Arrivals</h2>
      </div>
      {loading ? (
        <div className="home-new-arrivals-loading-container">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
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

  const Hero = () => {
    return (
      <section className="blog-hero" role="banner" tabIndex={0}>
        <div className="blog-hero-text">
          Bring the auspicious into your life today!
        </div>
        <Link to="/shop">
          <button className="blog-hero-button" type="button" tabIndex={0}>
            SHOP NOW
          </button>
        </Link>
      </section>
    );
  };

  return (
    <div className="home-page">
      <NavBar />
      <section className="home-hero-section">
        {/* The background image will display automatically via CSS */}
      </section>

      {renderNewArrivals()}

      <section className="home-categories">
        <div className="home-section-header">
          <h2>CATEGORIES</h2>
        </div>
        <div className="home-categories-grid">
          {homeCategories.map(category => (
            <Link to={`/shop?category=${category.filterId}`} key={category.filterId} className="home-category-card">
              <div className="home-category-image">
                <img src={category.image} alt={`${category.name} Icon`} />
              </div>
              <h3>{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>

    
      <section className="blog-hero" role="banner" tabIndex={0}>
        <div className="blog-hero-text">
          Bring the auspicious into your life today!
        </div>
        <Link to="/shop">
          <button className="blog-hero-button" type="button" tabIndex={0}>
            SHOP NOW
          </button>
        </Link>
      </section>


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
        <div className="home-section-header">
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
      <section className="home-blog-section">
        <div className="home-blog-container">
          <div className="home-blog-section-header">
            <h2>BLOG</h2>
            <p>Latest insights on Feng Shui and wellness</p>
          </div>
          {blogLoading ? (
            <div className="home-blog-loading">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="home-blog-grid">
              {blogs.slice(0, 4).map(blog => (
                <div className="home-blog-card" key={blog.blogID}>
                  <img
                    src={blog.cover_image}
                    className="home-blog-image"
                    alt="Blog Cover"
                  />
                  <div className="home-blog-content">
                    <h5 className="home-blog-title">{blog.title}</h5>
                    <p className="home-blog-meta">
                      {blog.category} • {new Date(blog.publish_date).toLocaleDateString()}
                    </p>
                    <p className="home-blog-excerpt">
                      {blog.content.substring(0, 120)}...
                    </p>
                    <Link to={`/blog/${blog.blogID}`} className="home-blog-read-more">
                      Read More
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
  <Footer forceShow={false} />
    </div>
  );
};

export default Home;
