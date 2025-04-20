import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Shop.css';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams(); // Get search params hook
  // Initialize selectedCategory from URL param or default to 'all'
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'books', name: 'Books' },
    { id: 'amulets', name: 'Amulets' },
    { id: 'bracelets', name: 'Bracelets' },
    { id: 'best-sellers', name: 'Best Sellers' },
    { id: 'flash-deals', name: 'Flash Deals' },
    { id: 'new-arrivals', name: 'New Arrivals' }
  ];

  // Effect to update category state if URL param changes
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam);
    } else {
      // If param is invalid or missing, default to 'all'
      setSelectedCategory('all');
    }
  }, [searchParams]); // Re-run when search params change

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, products]); // filterProducts depends on selectedCategory and products

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) {
        let errorMsg = 'Failed to fetch products';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const productsArray = Array.isArray(data.products) ? data.products : []; // Get the products array
      
      console.log("Raw products from API:", productsArray);

      setProducts(productsArray); // Set the raw products array
      setError(null);
    } catch (err) {
      setError('Error loading products. Please try again later.');
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
      return;
    }

    if (selectedCategory === 'best-sellers') {
      setFilteredProducts(products.filter(product => product.is_best_seller));
      return;
    }

    if (selectedCategory === 'flash-deals') {
      setFilteredProducts(products.filter(product => product.is_flash_deal));
      return;
    }

    if (selectedCategory === 'new-arrivals') {
      // Filter for products that are less than 30 days old
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      setFilteredProducts(products.filter(product => {
        const createdDate = new Date(product.created_at);
        return createdDate > thirtyDaysAgo;
      }));
      return;
    }

    // Filter by regular category name
    setFilteredProducts(products.filter(product => 
      product.category_name?.toLowerCase() === selectedCategory?.toLowerCase()
    ));
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  // Format currency (Add robustness)
  const formatPrice = (price) => {
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      console.warn(`Invalid price value received: ${price}`);
      return '₱NaN';
    }
    return `₱${numericPrice.toFixed(2)}`;
  };

  return (
    <div className="shop-container">
      <div className="shop-main">
        {/* Products Content */}
        <div className="products-content">
          <div className="shop-header">
            <h1>Shop</h1>
            <div className="category-dropdown">
              <button 
                className="dropdown-button" 
                onClick={toggleDropdown}
              >
                {categories.find(cat => cat.id === selectedCategory)?.name}
                <svg 
                  className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {dropdownOpen && (
                <div className="category-dropdown-menu">
                  {categories.map(category => (
                    <div 
                      key={category.id}
                      className={`dropdown-item ${selectedCategory === category.id ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(category.id)}
                    >
                      {category.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          {loading ? (
            <div className="loading-spinner">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="no-products">
              <p>No products found in this category.</p>
            </div>
          ) : (
            <div className="shop-products-grid">
              {filteredProducts.map(product => {
                const firstImage = product.images?.[0]?.url;
                const fullImageUrl = firstImage ? 
                  (firstImage.startsWith('/') ? `http://localhost:5000${firstImage}` : `http://localhost:5000/${firstImage}`) 
                  : '/placeholder-product.jpg'; 
                const imageToDisplay = fullImageUrl;

                const itemsSold = product.items_sold || 0; // Placeholder for items sold
                const displayItemsSold = itemsSold > 1000 ? `${(itemsSold / 1000).toFixed(1)}k sold` : `${itemsSold} sold`;

                return (
                  <div 
                    className="shop-product-card" 
                    key={product.product_id}
                    onClick={() => handleProductClick(product.product_id)} // Click whole card
                  >
                    <div 
                      className="shop-product-image"
                      style={{ backgroundImage: `url(${imageToDisplay})` }}
                    >
                      {/* Discount Percentage Tag */}
                      {product.discount_percentage > 0 && (
                        <div className="discount-percentage-tag">
                          -{product.discount_percentage}%
                        </div>
                      )}
                      
                      {/* Show variant tag if product has variants */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="variant-tag">
                          {product.variants.length} options
                        </div>
                      )}
                    </div>
                    <div className="shop-product-details">
                      <div className="product-info">
                        <h3>{product.name}</h3>
                      </div>
                      
                      <div className="product-price">
                        {product.discount_percentage > 0 ? (
                          <div className="price-amount">
                            <span className="discounted-price">
                              {formatPrice((product.price - (product.price * product.discount_percentage / 100)))}
                            </span>
                            <span className="original-price">{formatPrice(product.price)}</span>
                          </div>
                        ) : (
                          <div className="price-amount">
                            <span className="regular-price">{formatPrice(product.price)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="product-meta">
                        <span className="items-sold">{displayItemsSold}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage; 