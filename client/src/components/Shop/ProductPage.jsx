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
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('Error loading products. Please try again later.');
      console.error('Error fetching products:', err);
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

    // Filter by regular category
    setFilteredProducts(products.filter(product => product.category === selectedCategory));
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
    setAddedToCart(product.id);
    
    // Reset the "Added to cart" state after 2 seconds
    setTimeout(() => {
      setAddedToCart(null);
    }, 2000);
  };

  // Format currency
  const formatPrice = (price) => {
    return `₱${Number(price).toFixed(2)}`;
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  // Check if product image exists
  const getProductImage = (product) => {
    const defaultImage = product.category === 'books' 
      ? '/placeholder-book.jpg' 
      : product.category === 'amulets' 
        ? '/placeholder-amulet.jpg' 
        : '/placeholder-bracelet.jpg';
    
    return `http://localhost:5000${product.image_url}`;
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
              {filteredProducts.map(product => (
                <div 
                  className="shop-product-card" 
                  key={product.id}
                >
                  <div 
                    className="shop-product-image"
                    onClick={() => handleProductClick(product.id)} 
                    style={{ backgroundImage: `url(http://localhost:5000${product.image_url})` }}
                  >
                    {product.is_best_seller && (
                      <span className="product-tag best-seller-tag">Best Seller</span>
                    )}
                    {product.is_flash_deal && (
                      <span className="product-tag flash-deal-tag">
                        {product.discount_percentage}% OFF
                      </span>
                    )}
                  </div>
                  <div className="shop-product-details">
                    <div className="product-info">
                      <h3 onClick={() => handleProductClick(product.id)}>{product.name}</h3>
                      <p className="product-category">{product.category}</p>
                      
                      {product.is_flash_deal ? (
                        <div className="product-price">
                          <span className="original-price">{formatPrice(product.price)}</span>
                          <span className="discounted-price">
                            {formatPrice(calculateDiscountedPrice(product.price, product.discount_percentage))}
                          </span>
                        </div>
                      ) : (
                        <div className="product-price">
                          <span className="regular-price">{formatPrice(product.price)}</span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      className={`add-to-cart-button ${addedToCart === product.id ? 'added' : ''}`}
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      {addedToCart === product.id ? (
                        <>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="check-icon"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="cart-icon"
                          >
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                          </svg>
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage; 