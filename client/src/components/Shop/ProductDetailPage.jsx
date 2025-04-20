import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Shop.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, token, loading: authLoading } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [reviews, setReviews] = useState([]);

  // State for review functionality
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [purchaseCheckLoading, setPurchaseCheckLoading] = useState(false);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  useEffect(() => {
    const checkPurchaseAndReviewStatus = async () => {
      if (authLoading || !user || !token || !product?.product_id) {
        console.log('[Review Check] Skipping: Auth loading, no user, no token, or no product ID');
        setCanReview(false);
        setHasReviewed(false);
        return;
      }
      console.log(`[Review Check] User: ${user.id}, Product: ${product.product_id}, Token: Present`);

      setPurchaseCheckLoading(true);
      try {
        // 1. Check if user purchased this product
        console.log(`[Review Check] Fetching purchase status for product ${product.product_id}...`);
        const purchaseCheckRes = await fetch(`http://localhost:5000/api/orders/check/${product.product_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`[Review Check] Purchase check response status: ${purchaseCheckRes.status}`);
        if (purchaseCheckRes.ok) {
          const purchaseData = await purchaseCheckRes.json();
          console.log('[Review Check] Purchase check data:', purchaseData);
          setCanReview(purchaseData.hasPurchased);
        } else {
          console.error('[Review Check] Failed purchase check response:', await purchaseCheckRes.text());
          setCanReview(false); // Assume cannot review if check fails
        }

        // 2. Check if user has already submitted a review for this product
        const userReview = reviews.find(review => review.user_id === user.id);
        console.log('[Review Check] User review found:', userReview);
        setHasReviewed(!!userReview);
        
      } catch (err) {
        console.error('[Review Check] Error during purchase/review status check:', err);
        setCanReview(false);
        setHasReviewed(false);
      } finally {
        setPurchaseCheckLoading(false);
         // Log final state values after checks
        console.log(`[Review Check] Final states -> canReview: ${canReview}, hasReviewed: ${hasReviewed}`);
      }
    };

    // Only run the check if product and reviews are loaded (and user exists)
    if (product && reviews.length >= 0) { 
      console.log('[Review Check] Product/Reviews loaded, attempting purchase check...');
      checkPurchaseAndReviewStatus();
    } else if (!user && !authLoading) {
      // Reset status if user logs out (and auth isn't loading)
      console.log('[Review Check] User logged out, resetting status.');
      setCanReview(false);
      setHasReviewed(false);
    }

  }, [user, product, reviews, token, authLoading]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setReviews([]); // Reset reviews on new product load
      
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      
      const data = await response.json();
      console.log('Product data from API:', data);
      
      const parsedProduct = {
        ...data,
        stock_quantity: data.stock_quantity !== undefined ? Number(data.stock_quantity) : 0,
        average_rating: data.average_rating !== undefined ? Number(data.average_rating) : null, // Ensure rating is number
        review_count: data.review_count !== undefined ? Number(data.review_count) : 0
      };
      
      if (data.images && !Array.isArray(data.images)) {
        try {
          parsedProduct.images = typeof data.images === 'string' ? JSON.parse(data.images) : [];
        } catch (e) { parsedProduct.images = []; }
      } else if (!data.images) {
          parsedProduct.images = [];
      }
      
      setProduct(parsedProduct);
      
      // Set default image
      if (parsedProduct.images && parsedProduct.images.length > 0 && parsedProduct.images[0].url) {
          setSelectedImageUrl(getFullImageUrl(parsedProduct.images[0].url));
      } else if (parsedProduct.image_url) { // Fallback to primary image_url if exists
          setSelectedImageUrl(getFullImageUrl(parsedProduct.image_url));
      }
      
      // Fetch reviews
      const productIdForReviews = parsedProduct.product_id || parsedProduct.id; 
      if (productIdForReviews) {
        try {
          // Use the correct endpoint from reviews.js
          const reviewsResponse = await fetch(`http://localhost:5000/api/reviews/product/${productIdForReviews}`);
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            setReviews(reviewsData);
             console.log('Reviews fetched:', reviewsData);
          } else {
            console.error('Failed to fetch reviews:', reviewsResponse.status);
            setReviews([]); // Set empty if fetch fails
          }
        } catch (err) {
          console.error('Error fetching reviews:', err);
          setReviews([]);
        }
      }
    } catch (err) {
      console.error('Error in fetchProductDetails:', err);
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
    
    const itemToAdd = {
      product_id: product.product_id, // Use product_id directly
      id: product.product_id, // Keep id for compatibility
      name: product.name,
      price: product.price,
      image_url: getFullImageUrl(product.image_url || (product.images && product.images[0] ? product.images[0].url : null)),
      stock_quantity: product.stock_quantity,
      category_id: product.category_id,
      category_name: product.category_name,
      product_code: product.product_code
    };
    
    try {
      addToCart(itemToAdd, quantity);
      toast.success(`${quantity} x ${product.name} added to cart successfully!`);
      setAddedToCart(true);
      setTimeout(() => {
        setAddedToCart(false);
      }, 3000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart.");
    }
  };

  const handleBuyNow = () => {
    if (!product || product.stock_quantity <= 0) return;
    
    const itemToAdd = {
      product_id: product.product_id, // Use product_id directly
      id: product.product_id, // Keep id for compatibility
      name: product.name,
      price: product.price,
      image_url: getFullImageUrl(product.image_url || (product.images && product.images[0] ? product.images[0].url : null)),
      stock_quantity: product.stock_quantity,
      category_id: product.category_id,
      category_name: product.category_name,
      product_code: product.product_code
    };

    try {
      addToCart(itemToAdd, quantity);
      navigate('/cart'); // Navigate to cart for review
    } catch (error) {
      console.error("Error during Buy Now process:", error);
      toast.error("Could not proceed. Please try adding to cart first.");
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  const formatPrice = (price) => {
    if (!price) return '₱0.00';
    return `₱${Number(price).toFixed(2)}`;
  };

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  const getFullImageUrl = (url) => {
    if (!url) return '/placeholder-product.jpg';
    return url.startsWith('/') ? `http://localhost:5000${url}` : url;
  };
  
  const renderStars = (rating) => {
    const stars = [];
    const numRating = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fas fa-star ${i <= numRating ? 'filled' : 'empty'}`}
          style={{ color: i <= numRating ? '#ffc107' : '#e0e0e0', cursor: 'pointer' }} // Add cursor for rating form
          onClick={() => showReviewForm && setNewRating(i)} // Allow setting rating in form
        ></i>
      );
    }
    return stars;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleThumbnailClick = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
  };

  // --- NEW: Review Submission Handler ---
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (newRating === 0) {
      setReviewError('Please select a rating.');
      return;
    }
    if (!newComment.trim()) {
        setReviewError('Please enter a comment.');
        return;
    }

    setReviewLoading(true);
    setReviewError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/reviews/product/${product.product_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: newRating, review_text: newComment })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setNewRating(0);
      setNewComment('');
      // Re-fetch product details to get updated average rating and reviews
      fetchProductDetails(); 
      setHasReviewed(true); // Mark as reviewed

    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewError(err.message || 'An error occurred. Please try again.');
      toast.error(err.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  // --- Render Logic ---
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

  // --- Main JSX Return ---
  return (
    <div className="container product-detail-page-container">
      <button className="back-button" onClick={goBack}>
        <i className="fas fa-arrow-left"></i> Back to Shop
      </button>
      
      {/* Main Product Layout (Image + Info/Actions) */}
      <div className="product-detail-main-layout">
        {/* Image Gallery */}
        <div className="product-detail-image-gallery">
          <div className="main-image-container">
            <img
              src={selectedImageUrl || getFullImageUrl(product.image_url) || '/placeholder-product.jpg'} // Add placeholder fallback
              alt={product.name}
              className="main-product-image"
              onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-product.jpg'}} // Handle broken image links
            />
          </div>
          
          <div className="thumbnail-container">
            {/* Render thumbnails only from product.images array */}
            {Array.isArray(product.images) && product.images.length > 0 && product.images.map((image, idx) => {
              if (!image || !image.url) return null;
              const imageUrl = getFullImageUrl(image.url);
              return (
                <div
                  key={image.id || `image-${idx}`}
                  className={`thumbnail-item ${selectedImageUrl === imageUrl ? 'active' : ''}`}
                  onClick={() => handleThumbnailClick(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={`${product.name} - view ${idx + 1}`}
                    onError={(e) => { e.target.style.display='none'; }} // Hide broken thumbnails
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Info and Actions Section */}
        <div className="product-detail-info-actions">
          <h1 className="product-detail-name">{product.name}</h1>
          
          {/* Price Section */}
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

          {/* Rating Summary */}
          <div className="product-rating-summary">
            {product.average_rating !== null && Number(product.average_rating) > 0 ? (
              <>
                <span className="rating-value">{Number(product.average_rating).toFixed(1)}</span>
                <span className="rating-stars">{renderStars(product.average_rating)}</span>
                <span className="review-count">({product.review_count || 0} reviews)</span>
              </>
            ) : (
              <span className="rating-stars no-rating">{renderStars(0)}</span> 
            )}
          </div>

          {/* Shipping Info */}
          <div className="product-detail-shipping">
            <i className="fas fa-truck"></i>
            <span>Free shipping on orders over ₱1000</span>
          </div>
                    
          {/* Stock Status & Actions */}          
          {product.stock_quantity > 0 && product.stock_quantity !== undefined ? (
            <div className="product-detail-actions">
              {/* Stock Display */}          
              <div className="quantity-control-wrapper">
                <span className="stock-available">
                  {product.stock_quantity < 10 ? 
                    <><i className="fas fa-exclamation-circle"></i> Only {product.stock_quantity} left!</> : 
                    <><i className="fas fa-check-circle"></i> In Stock ({product.stock_quantity} available)</>}
                </span>
                {/* Quantity Input */}          
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
              
              {/* Action Buttons */}          
              <div className="product-detail-action-buttons">
                <button 
                  className={`action-button add-to-cart ${addedToCart ? 'added' : ''}`}
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity <= 0 || addedToCart}
                >
                  {addedToCart ? <><i className="fas fa-check"></i> Added</> : <><i className="fas fa-shopping-cart"></i> Add to Cart</>}
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
          
          {/* Specifications */}
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
              {/* Add other specs if available in product data */}
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
      
      {/* Description Container */}
      <div className="product-description-container">
        <h3>Product Description</h3>
        <div className="product-detail-description">
          {product.description || 'No description available.'}
        </div>
      </div>

      {/* Reviews Container */}
      <div className="product-detail-lower-section">
        <div className="reviews-section">
          <h3>Customer Reviews</h3>

          {/* NEW: Add Review Section (Conditional) */}
          {user && canReview && !hasReviewed && (
            <div className="add-review-section">
                <button 
                  className="toggle-review-form-btn" 
                  onClick={() => setShowReviewForm(!showReviewForm) /* Simple toggle */}
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              {showReviewForm && (
                <form onSubmit={handleReviewSubmit} className="review-form">
                  <div className="form-group rating-input">
                    <label>Your Rating:</label>
                    <div className="stars">{renderStars(newRating)}</div> 
                  </div>
                  <div className="form-group">
                    <label htmlFor="reviewComment">Your Comment:</label>
                    <textarea
                      id="reviewComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={4}
                      required
                    />
                  </div>
                  {reviewError && <p className="error-message">{reviewError}</p>}
                  <button type="submit" disabled={reviewLoading} className="submit-review-btn">
                    {reviewLoading ? 'Submitting...' : 'Submit Review' /* Always Submit */}
                  </button>
                </form>
              )}
            </div>
          )}
          {user && !canReview && !hasReviewed && !purchaseCheckLoading && (
              <p className="info-message">Purchase this item to leave a review.</p>
          )}
          {!user && (
              <p className="info-message">Login to leave a review.</p>
          )}

          {/* Existing Reviews List */}         
          <div className="reviews-container">
            {reviews && reviews.length > 0 ? (
              reviews.map((review, idx) => (
                <div key={review.review_id || idx} className="review-item">
                  <div className="review-header">
                    <span className="reviewer-name">{review.username || 'Anonymous'}</span>
                    <span className="review-date">{formatDate(review.created_at)}</span>
                  </div>
                  <div className="rating-stars">{renderStars(review.rating)}</div>
                  <div className="review-content">{review.review_text || 'No comment provided.'}</div>
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