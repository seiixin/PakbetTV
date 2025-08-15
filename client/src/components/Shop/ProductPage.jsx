import Sidebar from '../common/Sidebar';
import React, { useState, useEffect, useMemo } from 'react';
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
  const { getAllProducts, getNewArrivals, getBestSellers, getFlashDeals } = useProducts();
  const { getAllCategories } = useCategories();
  
  // Use regular query to load all products
  const { 
    data: productsData, 
    isLoading: productsLoading, 
    error: productsError
  } = getAllProducts;

  // Extract products from the data structure
  const allProducts = useMemo(() => {
    if (!productsData) return [];
    // Handle both array and object with products property
    if (Array.isArray(productsData)) return productsData;
    if (productsData.products && Array.isArray(productsData.products)) return productsData.products;
    return [];
  }, [productsData]);

  // Debugging information
  console.log('Products Debug:', {
    productsData,
    productsLoading,
    productsError,
    allProductsLength: allProducts.length
  });

  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = getAllCategories;
  const { data: newArrivals = [], isLoading: newArrivalsLoading, error: newArrivalsError } = getNewArrivals;
  const { data: bestSellers = [], isLoading: bestSellersLoading, error: bestSellersError } = getBestSellers;
  const { data: flashDeals = [], isLoading: flashDealsLoading, error: flashDealsError } = getFlashDeals;
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Mobile navigation states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedDropdowns, setExpandedDropdowns] = useState(new Set());
  
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Products', image: '/All-Products.svg' }
  ]);
  const [categoryMapping, setCategoryMapping] = useState(new Map());
  const navigate = useNavigate();

  // Create a mapping function to match navigation items with database categories
  const createCategoryMapping = (dbCategories) => {
    const mapping = new Map();
    
    // Navigation items to search for
    const navigationItems = [
      { navId: 'amulets', searchTerms: ['amulet', 'amulets'] },
      { navId: 'feng shui fashion', searchTerms: ['feng shui fashion', 'fashion', 'jewelry'] },
      { navId: 'incense & space clearing', searchTerms: ['incense', 'space clearing', 'incense & space clearing'] },
      { navId: 'feng shui bracelets', searchTerms: ['bracelet', 'bracelets', 'feng shui bracelet'] },
      { navId: 'feng shui books', searchTerms: ['book', 'books', 'feng shui book'] },
      { navId: 'auspicious home decor', searchTerms: ['home decor', 'decor', 'auspicious'] },
      { navId: 'windchimes', searchTerms: ['windchime', 'windchimes', 'wind chime'] },
      // Subcategories
      { navId: 'keychains', searchTerms: ['keychain', 'keychains'] },
      { navId: 'medallions', searchTerms: ['medallion', 'medallions'] },
      { navId: 'plaque', searchTerms: ['plaque', 'plaques'] },
      { navId: 'talisman card', searchTerms: ['talisman', 'card', 'talisman card'] },
      { navId: 'earrings', searchTerms: ['earring', 'earrings'] },
      { navId: 'necklaces', searchTerms: ['necklace', 'necklaces'] },
      { navId: 'pendants', searchTerms: ['pendant', 'pendants'] },
      { navId: 'rings', searchTerms: ['ring', 'rings'] },
      { navId: 'scarves & shawls', searchTerms: ['scarf', 'scarves', 'shawl', 'shawls'] },
      { navId: 'wallets', searchTerms: ['wallet', 'wallets'] },
      { navId: 'incense holder & burner', searchTerms: ['incense holder', 'incense burner', 'holder', 'burner'] },
      { navId: 'incense sticks', searchTerms: ['incense stick', 'incense sticks', 'stick'] },
      { navId: 'singing bowl', searchTerms: ['singing bowl', 'bowl'] },
      { navId: 'smudge kit', searchTerms: ['smudge', 'smudge kit'] },
      { navId: 'wishing paper', searchTerms: ['wishing paper', 'paper'] }
    ];

    // Map each navigation item to matching database categories
    navigationItems.forEach(navItem => {
      const matchingCategories = dbCategories.filter(dbCat => {
        const dbName = dbCat.name.toLowerCase();
        return navItem.searchTerms.some(term => 
          dbName.includes(term.toLowerCase()) || term.toLowerCase().includes(dbName)
        );
      });

      if (matchingCategories.length > 0) {
        // Use the first match, or the most specific one
        const bestMatch = matchingCategories.find(cat => 
          cat.name.toLowerCase() === navItem.navId.toLowerCase()
        ) || matchingCategories[0];
        
        mapping.set(navItem.navId, bestMatch.name.toLowerCase());
        console.log(`Mapped navigation "${navItem.navId}" to database category "${bestMatch.name}"`);
      } else {
        console.warn(`No matching database category found for navigation item: ${navItem.navId}`);
      }
    });

    return mapping;
  };

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
          : 'https://michaeldemesa.com/api';
        
        console.log('Testing categories API directly:', `${apiUrl}/categories`);
        const response = await fetch(`${apiUrl}/categories`);
        console.log('Direct API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Direct API response data:', data);
          console.log('Available category names:', data.map(cat => cat.name));
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
      console.log('Processing categories data:', categoriesData);
      
      // Create category mapping
      const mapping = createCategoryMapping(categoriesData);
      setCategoryMapping(mapping);
      
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

      console.log('Final categories after processing:', [{ id: 'all', name: 'All Products', image: null }, ...dbCategories]);
    }
  }, [categoriesData]);

  // Process products when data changes
  useEffect(() => {
    if (allProducts && Array.isArray(allProducts)) {
      // Filter products based on category and search
      filterProducts(allProducts);
    } else {
      setFilteredProducts([]);
    }
  }, [allProducts, selectedCategory, searchParams]);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    
    // Prevent body scroll when menu is open
    if (newState) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  // Toggle dropdown expansion
  const toggleDropdown = (dropdownId) => {
    const newExpanded = new Set(expandedDropdowns);
    if (newExpanded.has(dropdownId)) {
      newExpanded.delete(dropdownId);
    } else {
      newExpanded.add(dropdownId);
    }
    setExpandedDropdowns(newExpanded);
  };

  // Close mobile menu when clicking outside or on item
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = 'unset';
  };

  // Cleanup effect to reset body scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleCategoryClick = (categoryId) => {
    console.log('Category clicked:', categoryId);
    
    // Check if we have a mapping for this navigation item
    let finalCategoryId = categoryId;
    if (categoryMapping.has(categoryId)) {
      finalCategoryId = categoryMapping.get(categoryId);
      console.log(`Using mapped category: ${categoryId} -> ${finalCategoryId}`);
    }
    
    // Check if the category exists in our categories list
    const categoryExists = categories.some(cat => cat.id === finalCategoryId || cat.id === categoryId);
    if (!categoryExists && categoryId !== 'all') {
      console.warn(`Category not found: ${categoryId}, available categories:`, categories.map(c => c.id));
      // Fallback to 'all' if category doesn't exist
      finalCategoryId = 'all';
    }
    
    navigate(`/shop?category=${categoryId}`); // Keep original URL
    setSelectedCategory(finalCategoryId); // Use mapped category for filtering
    
    // Close mobile menu after selection
    closeMobileMenu();
  };

  const filterProducts = (products) => {
    const searchQuery = searchParams.get('search')?.toLowerCase();
    
    let filtered = [...products];
    if (selectedCategory && selectedCategory !== 'all') {
      console.log('Filtering products for category:', selectedCategory);
      console.log('Available products:', products.map(p => ({ name: p.name, category: p.category_name })));
      
      filtered = filtered.filter(product => {
        const productCategory = product.category_name?.toLowerCase();
        const matches = productCategory === selectedCategory.toLowerCase();
        if (matches) {
          console.log(`Product "${product.name}" matches category "${selectedCategory}"`);
        }
        return matches;
      });
      
      console.log(`Filtered ${filtered.length} products for category "${selectedCategory}"`);
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

  // Scroll to section function
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="shop-container">
      <NavBar />
      
      <div className="shop-main-layout">
        {/* Mobile Menu Toggle Button */}
        <button 
          className={`mobile-nav-toggle ${isMobileMenuOpen ? 'hidden' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <i className="fas fa-bars"></i>
        </button>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-nav-overlay" onClick={closeMobileMenu}></div>
        )}

              <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
        toggleDropdown={toggleDropdown}
        expandedDropdowns={expandedDropdowns}
        scrollToSection={scrollToSection}
      />

        {/* Main Content Area */}
        <div className="main-content">
          <div className="home-carousel">
            <div className="home-carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {carouselData.map((slide, index) => (
<div className="home-carousel-slide" key={index}>
  <div className="home-carousel-content">

    {/* Image side */}
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

    {/* Text side with gradient */}
    <div
      className="home-carousel-text-section"
      style={{
        background: slide.side === "left"
          ? `linear-gradient(to right, #3e0505, #0a0b38)` // red → blue when text is right
          : `linear-gradient(to left, #3e0505, #0a0b38)`, // red → blue when text is left
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

          {/* Mobile Quick Navigation - Shows after carousel on mobile only */}
          <div className="mobile-quick-nav">
            <div className="mobile-quick-nav-scroll">
              <Link to="/shop" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-store"></i>
                </div>
                <span className="mobile-quick-nav-text">ALL PRODUCTS</span>
              </Link>

              <div className="mobile-quick-nav-item" onClick={() => scrollToSection('new-arrivals-section')}>
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-star"></i>
                </div>
                <span className="mobile-quick-nav-text">WHAT'S NEW?</span>
              </div>
              
              <div className="mobile-quick-nav-item" onClick={() => scrollToSection('best-sellers-section')}>
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-trophy"></i>
                </div>
                <span className="mobile-quick-nav-text">BEST SELLERS</span>
              </div>
              
              <div className="mobile-quick-nav-item" onClick={() => scrollToSection('flash-deals-section')}>
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-bolt"></i>
                </div>
                <span className="mobile-quick-nav-text">FLASH DEALS</span>
              </div>
              
              <Link to="/category/amulets" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-gem"></i>
                </div>
                <span className="mobile-quick-nav-text">AMULETS</span>
              </Link>
              
              <Link to="/category/auspicious-home-decor" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-home"></i>
                </div>
                <span className="mobile-quick-nav-text">AUSPICIOUS HOME DECOR</span>
              </Link>
              
              <Link to="/category/feng-shui-bracelets" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-circle"></i>
                </div>
                <span className="mobile-quick-nav-text">FENG SHUI BRACELETS</span>
              </Link>
              
              <Link to="/category/feng-shui-books" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-book"></i>
                </div>
                <span className="mobile-quick-nav-text">FENG SHUI BOOKS</span>
              </Link>
              
              <Link to="/category/feng-shui-fashion" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-tshirt"></i>
                </div>
                <span className="mobile-quick-nav-text">FENG SHUI FASHION</span>
              </Link>
              
              <Link to="/category/incense-space-clearing" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-fire"></i>
                </div>
                <span className="mobile-quick-nav-text">INCENSE & SPACE CLEARING</span>
              </Link>
              
              <Link to="/category/windchimes" className="mobile-quick-nav-item">
                <div className="mobile-quick-nav-icon">
                  <i className="fas fa-music"></i>
                </div>
                <span className="mobile-quick-nav-text">WINDCHIMES</span>
              </Link>
            </div>
          </div>

          <h1 id="flash-deals-section">FLASH DEALS</h1>
          {flashDealsError && <div className="error-message">{flashDealsError.message}</div>}
          {flashDealsLoading ? (
            <div>Loading flash deals...</div>
          ) : (
            <>
              {console.log('Rendering flash deals section:', { flashDeals, flashDealsLoading, flashDealsError })}
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

          <h1 id="new-arrivals-section">NEW ARRIVALS</h1>
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
                  product={{
                    ...product,
                    price: product.price,
                    originalPrice: product.price,
                    discountedPrice: product.discounted_price,
                    discount_percentage: product.discount_percentage,
                    isDiscountValid: product.discount_percentage > 0
                  }} 
                />
              )) : null}
            </div>
          )}

          <h1 id="best-sellers-section">BEST SELLERS</h1>
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
                  product={{
                    ...product,
                    price: product.price,
                    originalPrice: product.price,
                    discountedPrice: product.discounted_price,
                    discount_percentage: product.discount_percentage,
                    isDiscountValid: product.discount_percentage > 0
                  }} 
                />
              )) : null}
            </div>
          )}

          <div className="Products-content">
            <h1>PRODUCTS</h1>
            
            {/* Categories below PRODUCTS header - now sticky */}
            <div className="products-categories-sticky">
              <div className="products-categories-container">
                {categoriesError && (
                  <div className="error-message">
                    Error loading categories: {categoriesError.message || categoriesError}
                  </div>
                )}
                {categoriesLoading ? (
                  <div className="categories-loading">Loading categories...</div>
                ) : (
                  <div className="products-categories-grid">
                    {Array.isArray(categories) ? categories.map(category => (
                      <div 
                        key={category.id}
                        className={`products-category-card ${selectedCategory === category.id ? 'active' : ''}`}
                        onClick={() => handleCategoryClick(category.id)}
                      >
                        {category.image && (
                          <div className="products-category-icon">
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

            {/* Products Grid */}
            <div className="products-grid-section">
            {productsError && <div className="error-message">{productsError}</div>}
            {productsLoading ? (
              <div>Loading products...</div>
            ) : !Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
              <div className="no-products">
                <p>No products found{searchParams.get('search') ? ' matching your search' : ' in this category'}.</p>
                {selectedCategory !== 'all' && (
                  <p><small>Category: {selectedCategory}</small></p>
                )}
              </div>
            ) : (
              <>
                <div className="shop-products-grid">
                  {Array.isArray(filteredProducts) ? filteredProducts.map(product => (
                    <ProductCard 
                      key={product.product_id} 
                      product={{
                        ...product,
                        price: product.price,
                        originalPrice: product.price,
                        discountedPrice: product.discounted_price,
                        discount_percentage: product.discount_percentage,
                        isDiscountValid: product.discount_percentage > 0
                      }} 
                    />
                  )) : null}
                </div>
              </>
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
