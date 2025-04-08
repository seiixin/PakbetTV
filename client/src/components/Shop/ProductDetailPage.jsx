import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Shop.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      const data = await response.json();
      setProduct(data);
      setError(null);
    } catch (err) {
      setError('Error loading product details. Please try again later.');
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < (product?.stock || 10)) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= (product?.stock || 10)) {
      setQuantity(value);
    }
  };

  const handleAddToCart = () => {
    // Add to cart logic here
    alert(`Added ${quantity} of ${product?.name} to cart`);
  };

  const handleBuyNow = () => {
    // Buy now logic here
    alert(`Proceeding to checkout with ${quantity} of ${product?.name}`);
  };

  const goBack = () => {
    navigate(-1);
  };

  // Format currency
  const formatPrice = (price) => {
    if (!price) return '₱0.00';
    return `₱${Number(price).toFixed(2)}`;
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  // Get product image with fallback
  const getProductImage = () => {
    if (!product) return '';
    
    const defaultImage = product.category === 'books' 
      ? '/placeholder-book.jpg' 
      : product.category === 'amulets' 
        ? '/placeholder-amulet.jpg' 
        : '/placeholder-bracelet.jpg';
    
    return `http://localhost:5000${product.image_url}`;
  };

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="loading-spinner">Loading product details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-container">
        <div className="error-message">{error}</div>
        <button className="back-button" onClick={goBack}>
          Back to Shop
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-container">
        <div className="error-message">Product not found</div>
        <button className="back-button" onClick={goBack}>
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button className="back-button" onClick={goBack}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Shop
      </button>
      
      <div className="product-detail-content">
        <div className="product-detail-left">
          <div 
            className="product-detail-image"
            style={{ backgroundImage: `url(${getProductImage()})` }}
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
        </div>
        
        <div className="product-detail-right">
          <h1 className="product-detail-name">{product.name}</h1>
          
          <div className="product-code">Product Code: {product.product_code}</div>
          
          <div className="product-detail-price">
            {product.is_flash_deal ? (
              <>
                <span className="original-price">{formatPrice(product.price)}</span>
                <span className="discounted-price">
                  {formatPrice(calculateDiscountedPrice(product.price, product.discount_percentage))}
                </span>
                <span className="discount-percentage">
                  {product.discount_percentage}% OFF
                </span>
              </>
            ) : (
              <span className="regular-price">{formatPrice(product.price)}</span>
            )}
          </div>
          
          <div className="product-detail-category">
            <span className="label">Category:</span> {product.category}
          </div>
          
          <div className="product-detail-stock">
            <span className="label">Availability:</span> 
            {product.stock > 0 ? (
              <span className="in-stock">In Stock ({product.stock} available)</span>
            ) : (
              <span className="out-of-stock">Out of Stock</span>
            )}
          </div>
          
          <div className="product-detail-description">
            <h3>Description</h3>
            <p>{product.description || 'No description available for this product.'}</p>
          </div>
          
          <div className="product-detail-actions">
            <div className="quantity-selector">
              <span className="label">Quantity:</span>
              <div className="quantity-input">
                <button 
                  className="quantity-btn" 
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  max={product.stock || 10}
                />
                <button 
                  className="quantity-btn" 
                  onClick={incrementQuantity}
                  disabled={quantity >= (product.stock || 10)}
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="action-buttons">
              <button 
                className="add-to-cart-button" 
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                Add to Cart
              </button>
              <button 
                className="buy-now-button" 
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage; 