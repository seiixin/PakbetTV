import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './ProductDetail.css';
import { createGlobalStyle } from 'styled-components';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';

const GlobalStyle = createGlobalStyle`
  body {
    overflow-x: hidden;
  }
`;

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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [attributeOptions, setAttributeOptions] = useState({});
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [purchaseCheckLoading, setPurchaseCheckLoading] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const pageEndRef = useRef(null);
  
  useEffect(() => {
    fetchProductDetails();
  }, [id]);
  useEffect(() => {
    if (product) {
      let defaultImageUrl = null;
      if (product.variants && product.variants.length > 0 && product.variants[0].image_url) {
        defaultImageUrl = getFullImageUrl(product.variants[0].image_url);
        console.log('Using first variant image as default:', defaultImageUrl);
      }
      else if (product.images && product.images.length > 0) {
        defaultImageUrl = getFullImageUrl(product.images[0].url);
        console.log('Using product image as default:', defaultImageUrl);
      }
      if (defaultImageUrl) {
        setSelectedImageUrl(defaultImageUrl);
        if (product.variants) {
          const matchingVariant = product.variants.find(v => 
            v.image_url && getFullImageUrl(v.image_url) === defaultImageUrl
          );
          if (matchingVariant && matchingVariant.attributes) {
            setSelectedAttributes(matchingVariant.attributes);
            console.log('Setting initial attributes from first variant:', matchingVariant.attributes);
          }
        }
      }
    }
  }, [product]);
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0 && Object.keys(selectedAttributes).length > 0) {
        console.log('[Attribute Effect] Updating variant based on selected attributes:', selectedAttributes);
        updateSelectedVariant(); 
    }
  }, [product, selectedAttributes]); 
  const updateSelectedVariant = () => {
    if (!product || !product.variants) return;
    console.log(`[updateSelectedVariant] Finding variant matching:`, selectedAttributes);
    const variant = product.variants.find(v => {
        return Object.entries(selectedAttributes).every(([key, value]) => {
            return v.attributes && v.attributes[key] === value;
        });
    });
    console.log(`[updateSelectedVariant] Found variant:`, variant);
    if (variant) {
      setSelectedVariant(variant); 
      if (quantity > variant.stock) {
        setQuantity(1);
      }
    } else {
      setSelectedVariant(null); 
      console.warn(`[updateSelectedVariant] No variant found matching attributes:`, selectedAttributes);
    }
  };
  const handleAttributeChange = (attributeName, value) => {
    console.log(`[handleAttributeChange] Setting ${attributeName} to ${value}`);
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  const isVariantCombinationAvailable = (currentSelections) => {
    if (!product || !product.variants) return false;
    return product.variants.some(v => 
      Object.entries(currentSelections).every(([key, value]) => 
          v.attributes && v.attributes[key] === value
      ) && v.stock > 0
    );
  };
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
        console.log(`[Review Check] Fetching purchase status for product ${product.product_id}...`);
        const purchaseCheckRes = await fetch(`${API_BASE_URL}/api/orders/check/${product.product_id}`, {
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
          setCanReview(false); 
        }
        const userReview = reviews.find(review => review.user_id === user.id);
        console.log('[Review Check] User review found:', userReview);
        setHasReviewed(!!userReview);
      } catch (err) {
        console.error('[Review Check] Error during purchase/review status check:', err);
        setCanReview(false);
        setHasReviewed(false);
      } finally {
        setPurchaseCheckLoading(false);
        console.log(`[Review Check] Final states -> canReview: ${canReview}, hasReviewed: ${hasReviewed}`);
      }
    };
    if (product && reviews.length >= 0) { 
      console.log('[Review Check] Product/Reviews loaded, attempting purchase check...');
      checkPurchaseAndReviewStatus();
    } else if (!user && !authLoading) {
      console.log('[Review Check] User logged out, resetting status.');
      setCanReview(false);
      setHasReviewed(false);
    }
  }, [user, product, reviews, token, authLoading]);
  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setReviews([]);
      setSelectedVariant(null);
      setAttributeOptions({});
      setSelectedAttributes({});
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      const data = await response.json();
      console.log('Product data from API:', data);
      const parsedProduct = {
        ...data,
        stock_quantity: data.stock_quantity !== undefined ? Number(data.stock_quantity) : 0,
        average_rating: data.average_rating !== undefined ? Number(data.average_rating) : null,
        review_count: data.review_count !== undefined ? Number(data.review_count) : 0,
        variants: Array.isArray(data.variants) ? data.variants : []
      };
      if (data.images && !Array.isArray(data.images)) {
        try {
          parsedProduct.images = typeof data.images === 'string' ? JSON.parse(data.images) : [];
        } catch (e) { parsedProduct.images = []; }
      } else if (!data.images) {
          parsedProduct.images = [];
      }
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        const options = {}; 
        const initialSelections = {}; 
        const allKeys = new Set();
        data.variants.forEach(variant => {
          if (variant.attributes) {
            Object.keys(variant.attributes).forEach(key => allKeys.add(key));
          }
        });
        allKeys.forEach(key => {
          const values = [...new Set(data.variants
            .map(variant => variant.attributes ? variant.attributes[key] : undefined)
            .filter(value => value !== undefined && value !== null && value !== '')) 
          ];
          if (values.length > 0) {
            options[key] = values; 
            initialSelections[key] = values[0]; 
          }
        });
        setAttributeOptions(options);
        console.log('Determined Attribute Options:', options);
        parsedProduct.variants = data.variants; 
      } else {
        parsedProduct.variants = [];
      }
      setProduct(parsedProduct);
      const productIdForReviews = parsedProduct.product_id || parsedProduct.id; 
      if (productIdForReviews) {
        try {
          const reviewsResponse = await fetch(`${API_BASE_URL}/api/reviews/product/${productIdForReviews}`);
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            setReviews(reviewsData);
             console.log('Reviews fetched:', reviewsData);
          } else {
            console.error('Failed to fetch reviews:', reviewsResponse.status);
            setReviews([]); 
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
    if (selectedVariant) {
      if (quantity < selectedVariant.stock) {
        setQuantity(prev => prev + 1);
      }
    } else if (product && quantity < product.stock_quantity) {
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
    if (product.variants && product.variants.length > 0) {
      if (!selectedVariant) {
        toast.error('Please select all options');
        return;
      }
      if (selectedVariant.stock <= 0) {
        toast.error('Selected variant is out of stock');
        return;
      }
    } else if (!product || product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    const itemToAdd = {
      product_id: product.product_id,
      id: product.product_id,
      name: product.name,
      price: selectedVariant ? selectedVariant.price : product.price,
      image_url: selectedVariant && selectedVariant.image_url 
        ? getFullImageUrl(selectedVariant.image_url)
        : getFullImageUrl(product.image_url || (product.images && product.images[0] ? product.images[0].url : null)),
      stock_quantity: selectedVariant ? selectedVariant.stock : product.stock_quantity,
      category_id: product.category_id,
      category_name: product.category_name,
      product_code: product.product_code,
      variant_id: selectedVariant ? selectedVariant.variant_id : null,
      variant_attributes: selectedVariant ? selectedVariant.attributes : null
    };
    try {
      addToCart(itemToAdd, quantity);
      let variantText = '';
      if (selectedVariant && selectedVariant.attributes) {
        variantText = Object.entries(selectedVariant.attributes)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      }
      toast.success(`${quantity} x ${product.name} ${variantText ? `(${variantText})` : ''} added to cart successfully!`);
      setAddedToCart(true);
      setTimeout(() => {
        setAddedToCart(false);
      }, 3000);
    } catch (err) {
      toast.error('Failed to add item to cart');
      console.error(err);
    }
  };
  const handleBuyNow = () => {
    if (product.variants && product.variants.length > 0) {
      if (!selectedVariant) {
        toast.error('Please select a size and color');
        return;
      }
      if (selectedVariant.stock <= 0) {
        toast.error('Selected variant is out of stock');
        return;
      }
    } else if (!product || product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    handleAddToCart();
    navigate('/checkout');
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
    if (!url) {
        console.warn('[getFullImageUrl] URL is missing, returning placeholder.');
        return '/placeholder-product.jpg';
    }
    if (url.startsWith('http')) {
        return url;
    }
    if (url.startsWith('/')) {
        return `${API_BASE_URL}${url}`;
    }
    console.log(`[getFullImageUrl] Prepending origin to relative path: ${url}`);
    return `${API_BASE_URL}/${url}`;
  };
  const renderStars = (rating) => {
    const stars = [];
    const numRating = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fas fa-star ${i <= numRating ? 'filled' : 'empty'}`}
          style={{ cursor: showReviewForm ? 'pointer' : 'default' }} 
          onClick={() => showReviewForm && setNewRating(i)} 
        />
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
      const response = await fetch(`${API_BASE_URL}/api/reviews/product/${product.product_id}`, {
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
      fetchProductDetails(); 
      setHasReviewed(true); 
    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewError(err.message || 'An error occurred. Please try again.');
      toast.error(err.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  // Update the scroll detection useEffect
  useEffect(() => {
    const handleScroll = () => {
      if (pageEndRef.current) {
        const rect = pageEndRef.current.getBoundingClientRect();
        const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
        setIsFooterVisible(isAtBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger initial check
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left"></i> Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <GlobalStyle />
      <NavBar />
      <div className="product-detail-page-container">
        <button onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left"></i> Go Back
        </button>

        {/* Container 1: Product Overview */}
        <div className="product-container product-overview-container">
          <div className="product-detail-main-layout">
            {/* Product Images */}
            <div className="product-detail-image-gallery">
              <div className="main-image-container">
                {selectedImageUrl && (
                  <img 
                    src={selectedImageUrl} 
                    alt={product.name} 
                    className="main-product-image" 
                  />
                )}
              </div>
              <div className="thumbnail-container">
                {product.images && product.images.length > 0 && product.images.map((image, index) => (
                  <div 
                    key={index}
                    className={`thumbnail-item ${getFullImageUrl(image.url) === selectedImageUrl ? 'active' : ''}`}
                    onClick={() => setSelectedImageUrl(getFullImageUrl(image.url))}
                  >
                    <img src={getFullImageUrl(image.url)} alt={`${product.name} thumbnail ${index + 1}`} />
                  </div>
                ))}
                {product.variants && product.variants.length > 0 && 
                  product.variants
                    .filter(v => v.image_url && (!product.images || !product.images.some(img => getFullImageUrl(img.url) === getFullImageUrl(v.image_url))))
                    .map((variant, index) => (
                      <div 
                        key={`variant-${index}`}
                        className={`thumbnail-item ${getFullImageUrl(variant.image_url) === selectedImageUrl ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedImageUrl(getFullImageUrl(variant.image_url));
                          if (variant.attributes) {
                            setSelectedAttributes(variant.attributes);
                          }
                        }}
                      >
                        <img src={getFullImageUrl(variant.image_url)} alt={`${product.name} variant ${index + 1}`} />
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Product Info and Actions */}
            <div className="product-detail-info-actions">
              <h1 className="product-detail-name">{product.name}</h1>
              
              {/* Price Section First */}
              <div className="product-detail-price-section">
                {product.discount_percentage > 0 ? (
                  <>
                    <div className="discounted-price">
                      <span className="price-currency">₱</span>
                      {calculateDiscountedPrice(
                        selectedVariant ? selectedVariant.price : product.price,
                        product.discount_percentage
                      )}
                    </div>
                    <div className="original-price">
                      <span className="price-currency">₱</span>
                      {formatPrice(selectedVariant ? selectedVariant.price : product.price)}
                    </div>
                    <div className="discount-badge">
                      {product.discount_percentage}% OFF
                    </div>
                  </>
                ) : (
                  <div className="regular-price">
                    <span className="price-currency">₱</span>
                    {formatPrice(selectedVariant ? selectedVariant.price : product.price)}
                  </div>
                )}
              </div>

              {/* Ratings Section Below Price */}
              <div className="product-rating-summary">
                <div className="rating-stars">
                  {renderStars(product.average_rating || 0)}
                </div>
                <span className="rating-value">{product.average_rating ? product.average_rating.toFixed(1) : '0.0'}</span>
                <span className="review-count">({product.review_count || 0} reviews)</span>
              </div>

              {Object.keys(attributeOptions).length > 0 && (
                <div className="variant-selection-container">
                  {Object.keys(attributeOptions).map((attributeName) => (
                    <div key={attributeName} className="variant-options">
                      <label>{attributeName.replace('_', ' ')}</label>
                      <div className="variant-buttons">
                        {attributeOptions[attributeName].map((value) => {
                          const isSelected = selectedAttributes[attributeName] === value;
                          const currentSelections = {
                            ...selectedAttributes,
                            [attributeName]: value,
                          };
                          const isAvailable = isVariantCombinationAvailable(currentSelections);
                          
                          return (
                            <button
                              key={value}
                              className={`variant-button ${isSelected ? 'selected' : ''} ${value.toLowerCase()}`}
                              onClick={() => handleAttributeChange(attributeName, value)}
                              disabled={!isAvailable}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="product-detail-actions">
                <div className="quantity-control-wrapper">
                  <div className={`stock-available ${(selectedVariant ? selectedVariant.stock : product.stock_quantity) > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {(selectedVariant ? selectedVariant.stock : product.stock_quantity) > 0 ? (
                      <>
                        <i className="fas fa-check-circle"></i> 
                        <span>In Stock ({selectedVariant ? selectedVariant.stock : product.stock_quantity} available)</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>Out of Stock</span>
                      </>
                    )}
                  </div>
                  
                  <div className="quantity-input">
                    <button 
                      className="quantity-btn"
                      onClick={decrementQuantity}
                      disabled={(selectedVariant ? selectedVariant.stock : product.stock_quantity) <= 0}
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={handleQuantityChange} 
                      min="1" 
                      max={selectedVariant ? selectedVariant.stock : product.stock_quantity}
                      disabled={(selectedVariant ? selectedVariant.stock : product.stock_quantity) <= 0}
                    />
                    <button 
                      className="quantity-btn"
                      onClick={incrementQuantity}
                      disabled={
                        (selectedVariant 
                          ? quantity >= selectedVariant.stock 
                          : quantity >= product.stock_quantity) || 
                        (selectedVariant ? selectedVariant.stock : product.stock_quantity) <= 0
                      }
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>

                <div className="product-detail-action-buttons">
                  <button 
                    className={`action-button add-to-cart ${addedToCart ? 'added' : ''}`}
                    onClick={handleAddToCart}
                    disabled={(selectedVariant ? selectedVariant.stock : product.stock_quantity) <= 0}
                  >
                    <i className={`fas ${addedToCart ? 'fa-check' : 'fa-shopping-cart'}`}></i>
                    {addedToCart ? 'Added to Cart' : 'Add to Cart'}
                  </button>
                  <button 
                    className="action-button buy-now"
                    onClick={handleBuyNow}
                    disabled={(selectedVariant ? selectedVariant.stock : product.stock_quantity) <= 0}
                  >
                    <i className="fas fa-bolt"></i>
                    Buy Now
                  </button>
                </div>
                
                {(selectedVariant ? selectedVariant.stock : product.stock_quantity) <= 0 && (
                  <div className="out-of-stock-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>This item is currently out of stock. Please check back later or browse similar items.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Container 2: Product Specifications */}
        <div className="product-container product-specs-container">
          <div className="product-description-section">
            <div className="section-header">
              <h2 className="section-title">Product Specifications</h2>
            </div>
            <div className="product-description-container">
              {product.description && <div dangerouslySetInnerHTML={{ __html: product.description }} />}
              
              {product.specs && (
                <div className="product-specs">
                  <h3>Specifications</h3>
                  <div className="spec-items-inline">
                    {Object.entries(product.specs).map(([key, value]) => (
                      <div key={key} className="spec-item">
                        <h5>{key.replace(/_/g, ' ')}</h5>
                        <p>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Container 3: Customer Reviews */}
        <div className="product-container product-reviews-container">
          <div className="product-reviews-section">
            <div className="section-header">
              <h2 className="section-title">Customer Reviews</h2>
              <div className="section-rating">
                <div className="rating-stars">{renderStars(product.average_rating || 0)}</div>
                <span>{product.average_rating ? product.average_rating.toFixed(1) : '0.0'}</span>
                <span className="review-count">({product.review_count || 0})</span>
              </div>
            </div>
            
            <div className="reviews-section">
              {user && canReview && !hasReviewed && (
                <div className="review-action">
                  <button 
                    className="toggle-review-form-btn"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                  >
                    <i className="fas fa-pen"></i>
                    {showReviewForm ? 'Cancel Review' : 'Write a Review'}
                  </button>
                </div>
              )}
              
              {showReviewForm && (
                <div className="add-review-section">
                  <form className="review-form" onSubmit={handleReviewSubmit}>
                    <div className="rating-input">
                      <label>Your Rating</label>
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i 
                            key={star}
                            className={`fas fa-star ${newRating >= star ? 'filled' : ''}`}
                            onClick={() => setNewRating(star)}
                          ></i>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="comment">Your Review</label>
                      <textarea 
                        id="comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows="4"
                        placeholder="Share your experience with this product..."
                        required
                      ></textarea>
                    </div>
                    
                    {reviewError && <div className="error-message">{reviewError}</div>}
                    
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={() => {
                          setShowReviewForm(false);
                          setNewRating(0);
                          setNewComment('');
                          setReviewError(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="submit-review-btn"
                        disabled={reviewLoading || newRating === 0 || !newComment.trim()}
                      >
                        {reviewLoading ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="reviews-container">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.review_id} className="review-item">
                      <div className="review-header">
                        <div className="reviewer-name">
                          {review.user_name || 'Anonymous User'}
                        </div>
                        <div className="rating-stars">
                          {renderStars(review.rating)}
                        </div>
                        <div className="review-date">
                          {formatDate(review.created_at)}
                        </div>
                      </div>
                      <div className="review-content">
                        {review.comment}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-reviews">
                    <i className="far fa-comment-dots"></i>
                    <p>No reviews yet. Be the first to share your experience!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Move the pageEndRef to a less visible element */}
        <div ref={pageEndRef} style={{ height: '1px', marginBottom: '-1px' }}></div>
      </div>
      
      {/* Update footer rendering */}
      <Footer forceShow={false} />
    </>
  );
};

export default ProductDetailPage; 