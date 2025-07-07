import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import './Shop.css';
import NavBar from '../NavBar';
import Footer from '../Footer';
import ProductCard from '../common/ProductCard';
import Sidebar from '../common/Sidebar';
import { useProducts } from '../../hooks/useProducts';

const CategoryPage = () => {
  const { category } = useParams();
  const { getAllProducts } = useProducts();
  const { data: productsData, isLoading: productsLoading, error: productsError } = getAllProducts;
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchParams] = useSearchParams();

  // Mobile navigation states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedDropdowns, setExpandedDropdowns] = useState(new Set());

  // Navigation items mapping with their search terms - memoized to prevent re-creation
  const navigationItems = useMemo(() => ({
    'amulets': { 
      name: 'Amulets', 
      searchTerms: ['amulet', 'amulets'],
      description: 'Discover our collection of powerful feng shui amulets designed to bring protection, luck, and positive energy into your life.'
    },
    'feng-shui-fashion': { 
      name: 'Feng Shui Fashion', 
      searchTerms: ['feng shui fashion', 'fashion', 'jewelry'],
      description: 'Stylish feng shui jewelry and fashion accessories that combine beauty with spiritual benefits.'
    },
    'incense-space-clearing': { 
      name: 'Incense & Space Clearing', 
      searchTerms: ['incense', 'space clearing', 'incense & space clearing'],
      description: 'Purify and energize your space with our premium incense and space clearing tools.'
    },
    'feng-shui-bracelets': { 
      name: 'Feng Shui Bracelets', 
      searchTerms: ['bracelet', 'bracelets', 'feng shui bracelet'],
      description: 'Wear positive energy on your wrist with our specially designed feng shui bracelets.'
    },
    'feng-shui-books': { 
      name: 'Feng Shui Books', 
      searchTerms: ['book', 'books', 'feng shui book'],
      description: 'Learn and master feng shui principles with our comprehensive collection of books.'
    },
    'auspicious-home-decor': { 
      name: 'Auspicious Home Decor', 
      searchTerms: ['home decor', 'decor', 'auspicious'],
      description: 'Transform your home into a sanctuary of positive energy with our feng shui home decor.'
    },
    'windchimes': { 
      name: 'Windchimes', 
      searchTerms: ['windchime', 'windchimes', 'wind chime'],
      description: 'Beautiful windchimes to enhance the flow of positive energy in your space.'
    },
    // Subcategories
    'keychains': { 
      name: 'Keychains', 
      searchTerms: ['keychain', 'keychains'],
      description: 'Carry positive energy with you wherever you go with our feng shui keychains.'
    },
    'medallions': { 
      name: 'Medallions', 
      searchTerms: ['medallion', 'medallions'],
      description: 'Powerful medallions for protection and good fortune.'
    },
    'plaque': { 
      name: 'Plaque', 
      searchTerms: ['plaque', 'plaques'],
      description: 'Decorative plaques with feng shui symbols for your home or office.'
    },
    'talisman-card': { 
      name: 'Talisman Card', 
      searchTerms: ['talisman', 'card', 'talisman card'],
      description: 'Portable talisman cards for protection and luck.'
    },
    'earrings': { 
      name: 'Earrings', 
      searchTerms: ['earring', 'earrings'],
      description: 'Elegant feng shui earrings that combine style with spiritual benefits.'
    },
    'necklaces': { 
      name: 'Necklaces', 
      searchTerms: ['necklace', 'necklaces'],
      description: 'Beautiful necklaces featuring feng shui symbols and gemstones.'
    },
    'pendants': { 
      name: 'Pendants', 
      searchTerms: ['pendant', 'pendants'],
      description: 'Meaningful pendants to attract positive energy and protection.'
    },
    'rings': { 
      name: 'Rings', 
      searchTerms: ['ring', 'rings'],
      description: 'Feng shui rings for luck, protection, and positive energy.'
    },
    'scarves-shawls': { 
      name: 'Scarves & Shawls', 
      searchTerms: ['scarf', 'scarves', 'shawl', 'shawls'],
      description: 'Luxurious scarves and shawls with feng shui designs.'
    },
    'wallets': { 
      name: 'Wallets', 
      searchTerms: ['wallet', 'wallets'],
      description: 'Feng shui wallets designed to attract wealth and prosperity.'
    },
    'incense-holder-burner': { 
      name: 'Incense Holder & Burner', 
      searchTerms: ['incense holder', 'incense burner', 'holder', 'burner'],
      description: 'Beautiful holders and burners for your incense and aromatherapy needs.'
    },
    'incense-sticks': { 
      name: 'Incense Sticks', 
      searchTerms: ['incense stick', 'incense sticks', 'stick'],
      description: 'Premium incense sticks for meditation, purification, and positive energy.'
    },
    'singing-bowl': { 
      name: 'Singing Bowl', 
      searchTerms: ['singing bowl', 'bowl'],
      description: 'Authentic singing bowls for meditation, healing, and space clearing.'
    },
    'smudge-kit': { 
      name: 'Smudge Kit', 
      searchTerms: ['smudge', 'smudge kit'],
      description: 'Complete smudging kits for cleansing and purifying your space.'
    },
    'wishing-paper': { 
      name: 'Wishing Paper', 
      searchTerms: ['wishing paper', 'paper'],
      description: 'Special papers for writing and manifesting your wishes and intentions.'
    }
  }), []);

  const currentCategory = useMemo(() => navigationItems[category], [navigationItems, category]);

  // Debug logging (commented out to prevent re-render issues)
  // useEffect(() => {
  //   console.log('CategoryPage Debug:', {
  //     category,
  //     currentCategory,
  //     productsData,
  //     productsLoading,
  //     productsError,
  //     isDataArray: Array.isArray(productsData),
  //     isProductsArray: Array.isArray(productsData?.products),
  //     productsCount: productsData?.products?.length || 0
  //   });
  // }, [category, currentCategory, productsData, productsLoading, productsError]);

  useEffect(() => {
    if (productsData && currentCategory) {
      // Access the products array from the data structure
      const products = productsData.products || productsData;
      
      // Ensure products is an array before filtering
      if (!Array.isArray(products)) {
        console.warn('Products data is not an array:', products);
        setFilteredProducts([]);
        return;
      }

      const searchQuery = searchParams.get('search')?.toLowerCase();
      
      let filtered = products.filter(product => {
        const productName = product.name?.toLowerCase() || '';
        const productDescription = product.description?.toLowerCase() || '';
        const productCategory = product.category_name?.toLowerCase() || '';
        const productCode = product.product_code?.toLowerCase() || '';

        // Check if product matches any of the search terms for this category
        const matchesCategory = currentCategory.searchTerms.some(term => {
          const searchTerm = term.toLowerCase();
          return productName.includes(searchTerm) ||
                 productDescription.includes(searchTerm) ||
                 productCategory.includes(searchTerm) ||
                 productCode.includes(searchTerm);
        });

        return matchesCategory;
      });

      // Apply additional search filter if present
      if (searchQuery) {
        filtered = filtered.filter(product => {
          const name = product.name?.toLowerCase() || '';
          const description = product.description?.toLowerCase() || '';
          const categoryName = product.category_name?.toLowerCase() || '';
          const code = product.product_code?.toLowerCase() || '';

          return name.includes(searchQuery) ||
                 description.includes(searchQuery) ||
                 categoryName.includes(searchQuery) ||
                 code.includes(searchQuery);
        });
      }

      setFilteredProducts(filtered);
    } else if (productsData && !currentCategory) {
      // Category not found, but we have products data
      setFilteredProducts([]);
    } else if (!productsLoading && !productsData) {
      // No products data and not loading
      console.warn('No products data available');
      setFilteredProducts([]);
    }
  }, [productsData, category, currentCategory, productsLoading, searchParams]);

  // Mobile menu functions
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
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

  // Handle navigation to shop page
  const handleShopNavigation = () => {
    closeMobileMenu();
    window.location.href = '/shop';
  };

  // Scroll to section function (for Sidebar component compatibility)
  const scrollToSection = (sectionId) => {
    // This function can be implemented if needed for scrolling functionality
    // For now, it's a placeholder to match the Sidebar component interface
    console.log('Scroll to section:', sectionId);
  };

  // Cleanup effect to reset body scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (productsLoading || !productsData) {
    return (
      <div className="shop-container">
        <NavBar />
        <div className="loading-container">
          <div></div>
          <p>Loading products...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="shop-container">
        <NavBar />
        <div className="error-container">
          <h2>Error loading products</h2>
          <p>{productsError.message}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="shop-container">
        <NavBar />
        <div className="error-container">
          <h2>Category not found</h2>
          <p>The requested category does not exist.</p>
        </div>
        <Footer />
      </div>
    );
  }

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

        {/* Sidebar Component */}
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          closeMobileMenu={closeMobileMenu} 
          toggleDropdown={toggleDropdown} 
          expandedDropdowns={expandedDropdowns} 
          scrollToSection={scrollToSection} 
        />
        
        {/* Main Content Area */}
        <div className="main-content">
          <div className="category-page-content">
            {/* Hero Section */}
            <section className="blog-hero" role="banner" tabIndex="0">
              <div className="blog-hero-text">
                {currentCategory.name}
              </div>
              <p>{currentCategory.description}</p>
            </section>

            {/* Products Section */}
            <div className="category-products-section">
              <div className="products-header">
                <h2>Products ({filteredProducts.length})</h2>
                {searchParams.get('search') && (
                  <p className="search-info">
                    Filtered by: "{searchParams.get('search')}"
                  </p>
                )}
              </div>
              
              {filteredProducts.length > 0 ? (
                <div className="products-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="no-products">
                  <h3>No products found</h3>
                  <p>
                    {searchParams.get('search') 
                      ? `No products found in ${currentCategory.name} matching "${searchParams.get('search')}"`
                      : `No products available in ${currentCategory.name} at the moment.`
                    }
                  </p>
                  <p style={{fontSize: '0.9rem', color: '#999', marginTop: '1rem'}}>
                    Total products available: {productsData?.products?.length || productsData?.length || 0}
                  </p>
                  <button onClick={handleShopNavigation} className="browse-all-btn">Browse All Products</button>
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

export default CategoryPage;