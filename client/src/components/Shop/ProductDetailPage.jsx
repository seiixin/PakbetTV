import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import './Shop.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      
      const data = await response.json();
      console.log('Product data from API:', data);
      console.log('Stock quantity type:', typeof data.stock_quantity);
      
      // Ensure stock_quantity is properly parsed as a number
      const parsedProduct = {
        ...data,
        stock_quantity: data.stock_quantity !== undefined ? Number(data.stock_quantity) : 0
      };
      
      // Ensure images array is properly handled
      if (data.images) {
        console.log('Original images:', data.images);
        // Ensure images is an array
        if (!Array.isArray(data.images)) {
          try {
            // If images is a string, try to parse it as JSON
            parsedProduct.images = typeof data.images === 'string' ? JSON.parse(data.images) : [];
          } catch (e) {
            console.error('Error parsing images:', e);
            parsedProduct.images = [];
          }
        }
      } else {
        parsedProduct.images = [];
      }
      
      console.log('Parsed product data:', parsedProduct);
      setProduct(parsedProduct);
      
      // Set default image
      if (data.image_url) {
        setSelectedImageUrl(getFullImageUrl(data.image_url));
      }
      
      // Fetch reviews if product has them
      if (data.id) {
        try {
          const reviewsResponse = await fetch(`http://localhost:5000/api/products/${data.id}/reviews`);
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            setReviews(reviewsData);
          }
        } catch (err) {
          console.error('Error fetching reviews:', err);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock_quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && product && value <= product.stock_quantity) {
      setQuantity(value);
    }
  };

  const handleAddToCart = () => {
    if (!product || product.stock_quantity <= 0) return;
    
    // Add to cart logic
    // For now, just show toast notification
    toast.success(`${quantity} x ${product.name} added to cart successfully!`);
    setAddedToCart(true);
    
    // Reset after 3 seconds to allow adding again
    setTimeout(() => {
      setAddedToCart(false);
    }, 3000);
  };

  const handleBuyNow = () => {
    if (!product || product.stock_quantity <= 0) return;
    
    // Logic to handle buy now
    // Add to cart first
    handleAddToCart();
    // Then navigate to checkout
    navigate('/checkout');
  };

  const goBack = () => {
    navigate(-1);
  };

  const formatPrice = (price) => {
    if (!price) return '₱0.00';
    return `₱${Number(price).toFixed(2)}`;
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  // Helper to construct full image URL
  const getFullImageUrl = (url) => {
    if (!url) return '/placeholder-product.jpg'; // Default placeholder
    return url.startsWith('/') ? `http://localhost:5000${url}` : url;
  };
  
  // Function to render star rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fas fa-star ${i <= rating ? 'filled' : 'empty'}`}
          style={{ color: i <= rating ? '#ffc107' : '#e0e0e0' }}
        ></i>
      );
    }
    return stars;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="container product-detail-page-container">
        <LoadingSpinner message="Loading product details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container product-detail-page-container">
        <div className="error-message">{error}</div>
        <button className="back-button" onClick={goBack}>
          <i className="fas fa-arrow-left"></i> Back to Shop
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container product-detail-page-container">
        <div className="error-message">Product not found</div>
        <button className="back-button" onClick={goBack}>
          <i className="fas fa-arrow-left"></i> Back to Shop
        </button>
      </div>
    );
  }

  const handleThumbnailClick = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
  };

  return (
    <div className="container product-detail-page-container">
      <button className="back-button" onClick={goBack}>
        <i className="fas fa-arrow-left"></i> Back to Shop
      </button>
      
      <div className="product-detail-main-layout">
        <div className="product-detail-image-gallery">
          <div className="main-image-container">
            <img
              src={selectedImageUrl || getFullImageUrl(product.image_url)}
              alt={product.name}
              className="main-product-image"
            />
          </div>
          
          <div className="thumbnail-container">
            {Array.isArray(product.images) && product.images.length > 0 && product.images.map((image, idx) => {
              // Make sure image has a url property
              if (!image || !image.url) return null;
              
              const imageUrl = getFullImageUrl(image.url);
              // Update selected image logic if the default wasn't set or needs refresh
              // This ensures the main image display updates if the underlying array changes
              // or if the initially selected image was based on a potentially removed explicit thumb
              if (!selectedImageUrl && idx === 0) {
                  setSelectedImageUrl(imageUrl); 
              }
              
              return (
                <div
                  key={image.id || `image-${idx}`}
                  className={`thumbnail-item ${selectedImageUrl === imageUrl ? 'active' : ''}`}
                  onClick={() => handleThumbnailClick(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={`${product.name} - view ${idx + 1}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="product-detail-info-actions">
          <h1 className="product-detail-name">{product.name}</h1>
          
          <div className="product-detail-price-section">
            {product.discount_percentage > 0 ? (
              <>
                <span className="discounted-price">
                  {formatPrice(calculateDiscountedPrice(product.price, product.discount_percentage))}
                </span>
                <span className="original-price">{formatPrice(product.price)}</span>
                <span className="discount-badge">
                  {product.discount_percentage}% OFF
                </span>
              </>
            ) : (
              <span className="regular-price">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* NEW: Rating and Review Count Section */}
          <div className="product-rating-summary">
            {product.average_rating !== null && product.average_rating > 0 ? (
              <>
                <span className="rating-value">{Number(product.average_rating).toFixed(1)}</span>
                <span className="rating-stars">{renderStars(product.average_rating)}</span>
                <span className="review-count">({product.review_count || 0} reviews)</span>
              </>
            ) : (
              <span className="rating-stars no-rating">{renderStars(0)}</span>
            )}
          </div>

          <div className="product-detail-shipping">
            <i className="fas fa-truck"></i>
            <span>Free shipping on orders over ₱1000</span>
          </div>
          
          {/* Description moved to its own container later */}
          
          {product.stock_quantity > 0 && product.stock_quantity !== undefined ? (
            <div className="product-detail-actions">
              <div className="quantity-control-wrapper">
                <span className="stock-available">
                  {product.stock_quantity < 10 ? 
                    <><i className="fas fa-exclamation-circle"></i> Only {product.stock_quantity} left!</> : 
                    <><i className="fas fa-check-circle"></i> In Stock ({product.stock_quantity} available)</>}
                </span>
                <div className="quantity-input">
                  <button 
                    className="quantity-btn" 
                    onClick={decrementQuantity} 
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    min="1"
                    max={product.stock_quantity}
                    aria-label="Quantity"
                  />
                  <button 
                    className="quantity-btn" 
                    onClick={incrementQuantity} 
                    disabled={quantity >= product.stock_quantity}
                    aria-label="Increase quantity"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>
              
              <div className="product-detail-action-buttons">
                <button 
                  className={`action-button add-to-cart ${addedToCart ? 'added' : ''}`}
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity <= 0 || addedToCart}
                >
                  {addedToCart ? <><i className="fas fa-check"></i> Added to Cart</> : <><i className="fas fa-shopping-cart"></i> Add to Cart</>}
                </button>
                <button 
                  className="action-button buy-now" 
                  onClick={handleBuyNow}
                  disabled={product.stock_quantity <= 0}
                >
                  <i className="fas fa-bolt"></i> Buy Now
                </button>
              </div>
            </div>
          ) : (
            <div className="out-of-stock-message">
              <i className="fas fa-exclamation-circle"></i> Out of Stock
            </div>
          )}
          
          {/* Product Specifications */}
          <div className="specifications-section">
            <h3>Specifications</h3>
            <div className="spec-items">
              <div className="spec-item">
                <span className="spec-label">Category</span>
                <span className="spec-value">{product.category_name || 'N/A'}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Product Code</span>
                <span className="spec-value">{product.product_code || 'N/A'}</span>
              </div>
              {product.dimensions && (
                <div className="spec-item">
                  <span className="spec-label">Dimensions</span>
                  <span className="spec-value">{product.dimensions}</span>
                </div>
              )}
              {product.material && (
                <div className="spec-item">
                  <span className="spec-label">Material</span>
                  <span className="spec-value">{product.material}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* NEW: Description Container */}
      <div className="product-description-container">
        <h3>Product Description</h3>
        <div className="product-detail-description">
          {product.description || 'No description available.'}
        </div>
      </div>

      {/* Reviews Section (already in its own container) */}
      <div className="product-detail-lower-section">
        <div className="reviews-section">
          <h3>Customer Reviews</h3>
          <div className="reviews-container">
            {reviews && reviews.length > 0 ? (
              reviews.map((review, idx) => (
                <div key={review.id || idx} className="review-item">
                  <div className="review-header">
                    <span className="reviewer-name">{review.user_name || 'Anonymous'}</span>
                    <span className="review-date">{formatDate(review.created_at)}</span>
                  </div>
                  <div className="rating-stars">{renderStars(review.rating)}</div>
                  <div className="review-content">{review.comment || 'No comment provided.'}</div>
                </div>
              ))
            ) : (
              <div className="no-reviews">
                <i className="fas fa-comment-slash" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
                <p>No reviews yet. Be the first to review this product!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage; 