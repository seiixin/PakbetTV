import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Shop.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';
import ProductCard from '../common/ProductCard';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [flashDeals, setFlashDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams(); 
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const categories = [
    { id: 'all', name: 'All Products', image: '/Categories-1.png' },
    { id: 'best-sellers', name: 'Best Sellers', image: '/Categories-1.png' },
    { id: 'flash-deals', name: 'Flash Deals', image: '/Categories-2.png' },
    { id: 'books', name: 'Books', image: '/Categories-3.png' },
    { id: 'amulets', name: 'Amulets', image: '/Categories-5.png' },
    { id: 'bracelets', name: 'Bracelets', image: '/Categories-4.png' },
    { id: 'new-arrivals', name: 'New Arrivals', image: '/Categories-2.png' }
  ];

  const carouselItems = [
    {
      id: 1,
      title: "New Arrivals",
      description: "Check out our latest collection of Feng Shui items",
      buttonText: "Shop Now",
      buttonLink: "/shop?category=new-arrivals",
      image: "/Aspiration-1.png" 
    },
    {
      id: 2,
      title: "Feng Shui Guide",
      description: "Learn the art of Feng Shui from our experts",
      buttonText: "Read More",
      buttonLink: "/blog",
      image: "/Aspiration-1.png"
    },
    {
      id: 3,
      title: "Special Offers",
      description: "Get up to 50% off on selected items",
      buttonText: "View Deals",
      buttonLink: "/shop?category=flash-deals",
      image: "/Aspiration-1.png"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1));
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory('all');
    }
  }, [searchParams]); 

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.products || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/shop?category=${categoryId}`);
    setSelectedCategory(categoryId);
  };

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, products, searchParams]); 

  const filterProducts = () => {
    const searchQuery = searchParams.get('search')?.toLowerCase();
    // Show all products in flash deals for now
    setFlashDeals(products);

    let filtered = [...products];
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        if (selectedCategory === 'best-sellers') {
          return product.items_sold > 100;
        } else if (selectedCategory === 'new-arrivals') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return new Date(product.created_at) > thirtyDaysAgo;
        } else {
          return product.category_name?.toLowerCase() === selectedCategory.toLowerCase();
        }
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(product => {
        const name = product.name?.toLowerCase() || '';
        const description = product.description?.toLowerCase() || '';
        const category = product.category_name?.toLowerCase() || '';
        const code = product.product_code?.toLowerCase() || '';

        return name.includes(searchQuery) ||
               description.includes(searchQuery) ||
               category.includes(searchQuery) ||
               code.includes(searchQuery);
      });
    }

    setFilteredProducts(filtered);
  };

  const Max_products_display = 6;

  return (
    <div className="shop-container">
      <NavBar />
      <div className="shop-main-2">
        <div className="products-content">
          <div className="carousel-container">
            <div className="carousel-content" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {carouselItems.map((item) => (
                <div key={item.id} className="carousel-item">
                  <div className="carousel-image">
                    <div className="carousel-text">
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <button 
                        className="carousel-button"
                        onClick={() => navigate(item.buttonLink)}
                      >
                        {item.buttonText}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="carousel-control prev" onClick={prevSlide}>❮</button>
            <button className="carousel-control next" onClick={nextSlide}>❯</button>
            <div className="carousel-indicators">
              {carouselItems.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-indicator ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>

          <h1>FLASH DEALS</h1>
          {error && <div className="error-message">{error}</div>}
          {loading ? (
            <div>Loading products...</div>
          ) : flashDeals.length === 0 ? (
            <div className="no-products">
              <p>No flash deals available at the moment.</p>
            </div>
          ) : (
            <div className="shop-products-grid">
              {flashDeals.slice(0, Max_products_display).map(product => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}

          <div className="shop-main">
            <div className="shop-categories">
              <div className={`shop-categories ${!isCategoriesVisible ? 'collapsed' : ''}`}>
                <div className="shop-categories-grid">
                  {categories.map(category => (
                    <div 
                      key={category.id}
                      className={`shop-category-card ${selectedCategory === category.id ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(category.id)}
                    >
                      <h3>{category.name}</h3>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="Products-content">
              <h1>PRODUCTS</h1>
              {error && <div className="error-message">{error}</div>}
              {loading ? (
                <div>Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="no-products">
                  <p>No products found{searchParams.get('search') ? ' matching your search' : ' in this category'}.</p>
                </div>
              ) : (
                <div className="shop-products-grid">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer forceShow={false} />
    </div>
  );
};

export default ProductPage;
