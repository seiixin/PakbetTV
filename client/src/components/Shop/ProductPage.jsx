import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Shop.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';
import ProductCard from '../common/ProductCard';
import { Link } from 'react-router-dom';

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
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Products', image: '/Categories-1.png' }
  ]);
  const navigate = useNavigate();

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
      buttonText: "Find Your Sign",
      buttonLink: "/prosper-guide",
      leftColor: "linear-gradient(135deg, #db1730 100%)",
      rightBackground: "url('/Zodiac-1.jpg')",
      side: "right"
    },
    {
      title: "SPECIAL OFFERS",
      description: "Take advantage of our limited-time deals on selected Feng Shui items. Transform your space while saving.",
      buttonText: "View Deals",
      buttonLink: "/shop?category=flash-deals",
      leftBackground: "url('/Carousel-2.jpg')",
      rightColor: "linear-gradient(135deg, #db1730 100%)",
      side: "left"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === 2 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory('all');
    }
  }, [searchParams, categories]); 

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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
      
      console.log('Raw data from API:', data); // Debug log

      // Process products to include discount information
      const processedProducts = (data.products || []).map(product => {
        // Get the original and discounted prices
        const price = parseFloat(product.price) || 0;
        const discountedPrice = parseFloat(product.discounted_price) || 0;
        const discountPercentage = parseFloat(product.discount_percentage) || 0;

        const processedProduct = {
          ...product,
          price: price,
          discounted_price: discountedPrice,
          discount_percentage: discountPercentage
        };

        console.log('Processed product:', processedProduct); // Debug log
        return processedProduct;
      });

      setProducts(processedProducts);
      
      // Filter flash deals to show products with discounted prices
      const validFlashDeals = processedProducts.filter(product => {
        const hasValidDiscount = product.discounted_price > 0 && product.discount_percentage > 0;
        console.log(`Product ${product.name} flash deal check:`, {
          price: product.price,
          discounted_price: product.discounted_price,
          discount_percentage: product.discount_percentage,
          isValid: hasValidDiscount
        });
        return hasValidDiscount;
      });

      console.log('Valid Flash Deals:', validFlashDeals); // Debug log
      setFlashDeals(validFlashDeals);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Current flashDeals state:', flashDeals); // Debug log
  }, [flashDeals]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      
      // Transform database categories to match our format
      const dbCategories = data.map(category => ({
        id: category.name.toLowerCase(),
        name: category.name,
        // The category_image is already a complete data URL from the server
        image: category.category_image || '/Categories-1.png'
      }));

      // Combine 'All Products' with database categories
      setCategories(prevCategories => {
        const allProductsCategory = prevCategories.find(cat => cat.id === 'all');
        return [allProductsCategory, ...dbCategories];
      });
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Keep the default 'All Products' category if there's an error
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
    
    // Keep the existing flash deals, don't override them here
    console.log('FilterProducts - current flashDeals:', flashDeals); // Debug log

    let filtered = [...products];
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        return product.category_name?.toLowerCase() === selectedCategory.toLowerCase();
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

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === 2 ? 0 : prev + 1));
  };

  const handleDotClick = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="shop-container">
      <NavBar />
      <div className="shop-main-2">
        <div className="products-content">
          <div className="home-carousel">
            <div className="home-carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {carouselData.map((slide, index) => (
                <div className="home-carousel-slide" key={index}>
                  <div className="home-carousel-content">
                    <div 
                      className="home-carousel-section"
                      style={{ 
                        background: slide.side === "left" 
                          ? slide.leftBackground || slide.leftColor 
                          : slide.rightBackground || slide.rightColor,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        order: slide.side === "left" ? 1 : 2
                      }}
                    />
                    <div 
                      className="home-carousel-text-section"
                      style={{ 
                        background: slide.side === "left" 
                          ? slide.rightBackground || slide.rightColor 
                          : slide.leftBackground || slide.leftColor,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        order: slide.side === "left" ? 2 : 1
                      }}
                    >
                      <div className="home-carousel-text">
                        <h2>{slide.title}</h2>
                        <p>{slide.description}</p>
                        <Link to={slide.buttonLink} className="home-carousel-button">
                          {slide.buttonText}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="home-carousel-nav prev" onClick={handlePrevSlide}>❮</button>
            <button className="home-carousel-nav next" onClick={handleNextSlide}>❯</button>
            <div className="home-carousel-dots">
              {carouselData.map((_, index) => (
                <span 
                  key={index}
                  className={`home-carousel-dot ${currentSlide === index ? 'active' : ''}`} 
                  onClick={() => handleDotClick(index)}
                ></span>
              ))}
            </div>
          </div>

          <h1>FLASH DEALS</h1>
          {error && <div className="error-message">{error}</div>}
          {loading ? (
            <div>Loading products...</div>
          ) : (
            <>
              {console.log('Rendering flash deals section:', { flashDeals, loading, error })}
              {(!flashDeals || flashDeals.length === 0) ? (
                <div className="no-products">
                  <p>No flash deals available at the moment.</p>
                </div>
              ) : (
                <div className="shop-products-grid">
                  {flashDeals.slice(0, Max_products_display).map(product => {
                    console.log('Rendering flash deal product:', product);
                    return (
                      <ProductCard 
                        key={product.product_id} 
                        product={{
                          ...product,
                          price: product.price,
                          originalPrice: product.price,
                          discountedPrice: product.discounted_price,
                          discount_percentage: product.discount_percentage,
                          isDiscountValid: true
                        }} 
                      />
                    );
                  })}
                </div>
              )}
            </>
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
                      <div className="shop-category-icon">
                        <img src={category.image} alt={`${category.name} icon`} />
                      </div>
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
                    <ProductCard 
                      key={product.product_id} 
                      product={{
                        ...product,
                        price: product.price,
                        originalPrice: product.originalPrice,
                        discountedPrice: product.discounted_price,
                        discount_percentage: product.discount_percentage,
                        isDiscountValid: product.isDiscountValid
                      }} 
                    />
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
