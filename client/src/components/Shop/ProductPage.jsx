import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Shop.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';
import ProductCard from '../common/ProductCard';
import { Link } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';

const ProductPage = () => {
  const { getAllProducts, getNewArrivals, getBestSellers } = useProducts();
  const { getAllCategories } = useCategories();
  const { data: productsData, isLoading: productsLoading, error: productsError } = getAllProducts;
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = getAllCategories;
  const { data: newArrivals = [], isLoading: newArrivalsLoading, error: newArrivalsError } = getNewArrivals;
  const { data: bestSellers = [], isLoading: bestSellersLoading, error: bestSellersError } = getBestSellers;
  const [flashDeals, setFlashDeals] = useState([]);
  const [searchParams] = useSearchParams(); 
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Products', image: '/All-Products.svg' }
  ]);
  const navigate = useNavigate();

  // Debug categories data
  console.log('Categories Debug:', {
    categoriesData,
    categoriesLoading,
    categoriesError,
    categories,
    localCategoriesLength: categories.length,
    getAllCategoriesQueryState: getAllCategories
  });

  // Additional debugging for categories hook
  console.log('useCategories hook details:', {
    hookResult: getAllCategories,
    isIdle: getAllCategories.isIdle,
    isLoading: getAllCategories.isLoading,
    isError: getAllCategories.isError,
    isFetching: getAllCategories.isFetching,
    dataUpdatedAt: getAllCategories.dataUpdatedAt
  });

  // Test categories API directly
  useEffect(() => {
    const testCategoriesAPI = async () => {
      try {
        const isDev = process.env.NODE_ENV === 'development';
        const apiUrl = isDev 
          ? '/api' 
          : 'https://pakbettv.gghsoftwaredev.com/api';
        
        console.log('Testing categories API directly:', `${apiUrl}/categories`);
        const response = await fetch(`${apiUrl}/categories`);
        console.log('Direct API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Direct API response data:', data);
        } else {
          console.error('Direct API response failed:', response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error('Direct API test failed:', error);
      }
    };
    
    testCategoriesAPI();
  }, []);

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

  // Process categories when data changes
  useEffect(() => {
    if (categoriesData && Array.isArray(categoriesData)) {
      // Transform database categories to match our format
      const dbCategories = categoriesData.map(category => ({
        id: category.name.toLowerCase(),
        name: category.name,
        image: category.category_image || null
      }));

      // Combine 'All Products' with database categories
      setCategories(prevCategories => {
        const allProductsCategory = {
          id: 'all',
          name: 'All Products',
          image: null
        };
        return [allProductsCategory, ...dbCategories];
      });
    }
  }, [categoriesData]);

  // Process products when data changes
  useEffect(() => {
    if (productsData?.products && Array.isArray(productsData.products)) {
      // Process flash deals
      const validFlashDeals = productsData.products.filter(product => {
        const hasValidDiscount = product.discounted_price > 0 && product.discount_percentage > 0;
        return hasValidDiscount;
      });
      setFlashDeals(validFlashDeals);
      
      // Filter products based on category and search
      filterProducts(productsData.products);
    } else {
      // Set empty arrays as fallback
      setFlashDeals([]);
      setFilteredProducts([]);
    }
  }, [productsData, selectedCategory, searchParams]);

  const handleCategoryClick = (categoryId) => {
    navigate(`/shop?category=${categoryId}`);
    setSelectedCategory(categoryId);
    setIsMobileSidebarOpen(false); // Close mobile sidebar when category is selected
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const filterProducts = (products) => {
    const searchQuery = searchParams.get('search')?.toLowerCase();
    
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

  const MAX_DISPLAY_PRODUCTS = 12;

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
      
      {/* Mobile Categories Toggle Button */}
      <button 
        className="mobile-categories-toggle"
        onClick={toggleMobileSidebar}
        aria-label="Toggle Categories"
      >
        <i className="fas fa-bars"></i>
        <span>Categories</span>
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Categories Sidebar */}
      <div className={`categories-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="categories-sidebar-header">
          <h3>Categories</h3>
          <button 
            className="close-sidebar-btn"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="sidebar-categories">
          {categoriesError && (
            <div className="error-message">
              Error loading categories: {categoriesError.message || categoriesError}
            </div>
          )}
          {categoriesLoading ? (
            <div>Loading categories...</div>
          ) : (
            <div className="sidebar-categories-list">
              {Array.isArray(categories) ? categories.map(category => (
                <div 
                  key={category.id}
                  className={`sidebar-category-card ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.image && (
                    <div className="sidebar-category-icon">
                      <img src={category.image} alt={`${category.name} icon`} />
                    </div>
                  )}
                  <span className="sidebar-category-name">{category.name}</span>
                </div>
              )) : (
                <div>No categories available</div>
              )}
            </div>
          )}
        </div>
      </div>

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
          {productsError && <div className="error-message">{productsError}</div>}
          {productsLoading ? (
            <div>Loading products...</div>
          ) : (
            <>
              {console.log('Rendering flash deals section:', { flashDeals, productsLoading, productsError })}
              {(!Array.isArray(flashDeals) || flashDeals.length === 0) ? (
                <div className="no-products">
                  <p>No flash deals available at the moment.</p>
                </div>
              ) : (
                <div className="shop-products-grid">
                  {Array.isArray(flashDeals) ? flashDeals.slice(0, MAX_DISPLAY_PRODUCTS).map(product => {
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
                  }) : null}
                </div>
              )}
            </>
          )}

          <h1>NEW ARRIVALS</h1>
          {newArrivalsLoading ? (
            <div>Loading new arrivals...</div>
          ) : newArrivalsError ? (
            <div className="error-message">{newArrivalsError.message}</div>
          ) : !Array.isArray(newArrivals) || newArrivals.length === 0 ? (
            <div className="no-products">
              <p>No new arrivals at the moment.</p>
            </div>
          ) : (
            <div className="shop-products-grid">
              {Array.isArray(newArrivals) ? newArrivals.slice(0, MAX_DISPLAY_PRODUCTS).map(product => (
                <ProductCard 
                  key={product.product_id} 
                  product={product} 
                />
              )) : null}
            </div>
          )}

          <h1>BEST SELLERS</h1>
          {bestSellersLoading ? (
            <div>Loading best sellers...</div>
          ) : bestSellersError ? (
            <div className="error-message">{bestSellersError.message}</div>
          ) : !Array.isArray(bestSellers) || bestSellers.length === 0 ? (
            <div className="no-products">
              <p>No best sellers available at the moment.</p>
            </div>
          ) : (
            <div className="shop-products-grid">
              {Array.isArray(bestSellers) ? bestSellers.slice(0, MAX_DISPLAY_PRODUCTS).map(product => (
                <ProductCard 
                  key={product.product_id} 
                  product={product} 
                />
              )) : null}
            </div>
          )}

          {/* Desktop Categories Section */}
          <div className="desktop-categories-section">
            <h1>SHOP BY CATEGORY</h1>
            <div className="shop-categories">
              <div className={`shop-categories ${!isCategoriesVisible ? 'collapsed' : ''}`}>
                {categoriesError && (
                  <div className="error-message">
                    Error loading categories: {categoriesError.message || categoriesError}
                  </div>
                )}
                {categoriesLoading ? (
                  <div>Loading categories...</div>
                ) : (
                  <div className="shop-categories-grid">
                    {Array.isArray(categories) ? categories.map(category => (
                      <div 
                        key={category.id}
                        className={`shop-category-card ${selectedCategory === category.id ? 'active' : ''}`}
                        onClick={() => handleCategoryClick(category.id)}
                      >
                        {category.image && (
                          <div className="shop-category-icon">
                            <img src={category.image} alt={`${category.name} icon`} />
                          </div>
                        )}
                        <h3>{category.name}</h3>
                      </div>
                    )) : (
                      <div>No categories available</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="Products-content">
            <h1>PRODUCTS</h1>
            {productsError && <div className="error-message">{productsError}</div>}
            {productsLoading ? (
              <div>Loading products...</div>
            ) : !Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
              <div className="no-products">
                <p>No products found{searchParams.get('search') ? ' matching your search' : ' in this category'}.</p>
              </div>
            ) : (
              <div className="shop-products-grid">
                {Array.isArray(filteredProducts) ? filteredProducts.map(product => (
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
                )) : null}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer forceShow={false} />
    </div>
  );
};

export default ProductPage;
