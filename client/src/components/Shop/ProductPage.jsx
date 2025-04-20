import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './Shop.css';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(null);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'books', name: 'Books' },
    { id: 'amulets', name: 'Amulets' },
    { id: 'bracelets', name: 'Bracelets' },
    { id: 'best-sellers', name: 'Best Sellers' },
    { id: 'flash-deals', name: 'Flash Deals' },
    { id: 'new-arrivals', name: 'New Arrivals' }
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) {
        // Attempt to parse error message from backend if possible
        let errorMsg = 'Failed to fetch products';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) {
          // Ignore if response body isn't valid JSON
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      // Ensure data is an array, checking for potential nesting under 'products' or directly as an array
      const productsArray = Array.isArray(data) ? data : (data && Array.isArray(data.products) ? data.products : []);
      setProducts(productsArray); // Set the main products state
      setError(null);
    } catch (err) {
      setError('Error loading products. Please try again later.');
      console.error('Error fetching products:', err);
      setProducts([]); // Ensure products is an empty array on error
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

  // Handle adding product to cart
  const handleAddToCart = (e, product) => {
    e.stopPropagation(); // Prevent navigation when clicking the button
    addToCart(product, 1);
    setAddedToCart(product.product_id);
    
    // Reset the "Added to cart" state after 2 seconds
    setTimeout(() => {
      setAddedToCart(null);
    }, 2000);
  };

  // Get primary image URL from images array
  const getPrimaryImageUrl = (images) => {
    if (!Array.isArray(images) || images.length === 0) {
      return null;
    }
    // Find image with order 0, or default to the first image
    const primary = images.find(img => img.order === 0) || images[0]; 
    return primary ? primary.url : null; // Return URL or null if no image found
  };
  
  // Format currency (Add robustness)
  const formatPrice = (price) => {
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      console.warn(`Invalid price value received: ${price}`);
      return '₱NaN'; // Indicate error clearly
    }
    return `₱${numericPrice.toFixed(2)}`;
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
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
                const imageUrl = getPrimaryImageUrl(product.images);
                const fullImageUrl = imageUrl ? `http://localhost:5000${imageUrl}` : null;
                const imageToDisplay = fullImageUrl || '/placeholder-product.jpg'; 
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
                      {/* Optional: Add other tags like Free Shipping if data exists */}
                      {/* {product.free_shipping && <span className="product-tag free-shipping-tag">Free Shipping</span>} */}
                    </div>
                    <div className="shop-product-details">
                      <div className="product-info">
                        <h3>{product.name}</h3>
                        {/* Category hidden as per new style */}
                        {/* <p className="product-category">{product.category_name || 'Uncategorized'}</p> */}
                      </div>
                      
                      {/* Bottom section: Price and Items Sold */}
                      <div className="product-card-bottom">
                        <div className="product-price">
                          {product.discount_percentage > 0 ? (
                            <div className="price-amount">
                              <span className="discounted-price">{formatPrice(calculateDiscountedPrice(product.price, product.discount_percentage))}</span>
                              {/* Optionally show original price if needed */}
                              {/* <span className="original-price">{formatPrice(product.price)}</span> */}
                            </div>
                          ) : (
                            <div className="price-amount">
                              <span className="regular-price">{formatPrice(product.price)}</span>
                            </div>
                          )}
                        </div>
                        <div className="items-sold">{displayItemsSold}</div>
                      </div>
                      
                      {/* Add to Cart Button Removed */}
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