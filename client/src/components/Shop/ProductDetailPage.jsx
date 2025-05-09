import React, { useState, useEffect, useCallback } from 'react';
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
          style={{ color: i <= numRating ? '#ffc107' : '#e0e0e0', cursor: 'pointer' }} 
          onClick={() => showReviewForm && setNewRating(i)} 
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
  if (loading) {
    return (
      <div className="container product-detail-page-container">
        <NavBar />
        <LoadingSpinner message="Loading product details..." />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container product-detail-page-container">
        <NavBar />
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
        <NavBar />
        <div className="error-message">Product not found</div>
        <button className="back-button" onClick={goBack}>
          <i className="fas fa-arrow-left"></i> Back to Shop
        </button>
      </div>
    );
  }
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock_quantity;
  return (
    <>
      <GlobalStyle />
      <div className="container product-detail-page-container">
        <NavBar />
        
        <Link to="/shop" className="back-button">
          <i className="fas fa-arrow-left"></i> Back to Shop
        </Link>
        
        <div className="product-detail-main-layout">
          <div className="product-detail-image-gallery">
            <div className="main-image-container">
              <img
                src={selectedVariant?.image_url ? getFullImageUrl(selectedVariant.image_url) : (selectedImageUrl || (product.images?.[0]?.url ? getFullImageUrl(product.images[0].url) : '/placeholder-product.jpg'))}
                alt={product.name}
                className="main-product-image"
                onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-product.jpg'}}
              />
            </div>
            
            <div className="thumbnail-container">
              {Array.isArray(product.images) && product.images.length > 0 && product.images.map((image, idx) => {
                const imageUrl = getFullImageUrl(image.url);
                const isBaseImageActive = !selectedVariant && idx === 0; 
                return (
                  <div
                    key={image.id || `image-${idx}`}
                    className={`thumbnail-item ${isBaseImageActive ? 'active' : ''}`}
                    onClick={() => {
                       const initialSelections = {};
                       Object.keys(attributeOptions).forEach(key => {
                           if (attributeOptions[key]?.length > 0) {
                               initialSelections[key] = attributeOptions[key][0];
                           }
                       });
                       setSelectedAttributes(initialSelections);
                    }}
                   >
                    <img
                      src={imageUrl}
                      alt={`${product.name} - view ${idx + 1}`}
                      onError={(e) => { e.target.style.display='none'; }}
                    />
                  </div>
                );
              })}
              
              {Array.isArray(product.variants) && product.variants
                .filter(variant => variant.image_url)
                .map((variant, idx) => {
                  const variantImageUrl = getFullImageUrl(variant.image_url);
                  const isCurrentVariantImage = selectedVariant?.variant_id === variant.variant_id;
                  return (
                    <div
                      key={`variant-${variant.variant_id}`}
                      className={`thumbnail-item ${isCurrentVariantImage ? 'active' : ''}`}
                      onClick={() => {
                          if(variant.attributes) {
                              setSelectedAttributes(variant.attributes);
                          }
                      }}
                    >
                      <img
                        src={variantImageUrl}
                        alt={`${product.name} - ${variant.attributes ? Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(', ') : 'Variant'}`}
                        onError={(e) => { e.target.style.display='none'; }}
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
                    <span className="price-currency">₱</span>
                    {calculateDiscountedPrice(currentPrice, product.discount_percentage)}
                  </span>
                  <span className="original-price">
                    <span className="price-currency">₱</span>
                    {currentPrice}
                  </span>
                  <span className="discount-badge">
                    {product.discount_percentage}% OFF
                  </span>
                </>
              ) : (
                <span className="regular-price">
                  <span className="price-currency">₱</span>
                  {currentPrice}
                </span>
              )}
            </div>
            
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
            
            {Object.keys(attributeOptions).length > 0 && (
              <div className="variant-selection-container">
                {Object.entries(attributeOptions).map(([attributeName, availableValues]) => (
                  <div key={attributeName} className="variant-options">
                    <label>{attributeName}:</label>
                    <div className="variant-buttons">
                      {availableValues.map((value) => (
                        <button
                          key={`${attributeName}-${value}`}
                          className={`variant-button ${selectedAttributes[attributeName] === value ? 'selected' : ''} ${value.toLowerCase() === 'emerald' ? 'emerald' : ''}`}
                          onClick={() => handleAttributeChange(attributeName, value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="product-detail-shipping">
              <i className="fas fa-truck"></i>
              <span>Free shipping on orders over ₱1000</span>
            </div>
            
            {currentStock > 0 ? (
              <div className="product-detail-actions">
                <div className="quantity-control-wrapper">
                  <span className="stock-available">
                    {currentStock < 10 ? 
                      <><i className="fas fa-exclamation-circle"></i> Only {currentStock} left!</> : 
                      <><i className="fas fa-check-circle"></i> In Stock ({currentStock} available)</>}
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
                      max={currentStock}
                      aria-label="Quantity"
                    />
                    <button 
                      className="quantity-btn" 
                      onClick={incrementQuantity}
                      disabled={quantity >= currentStock}
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
                    disabled={currentStock <= 0 || addedToCart}
                  >
                    {addedToCart ? <><i className="fas fa-check"></i> Added</> : <><i className="fas fa-shopping-cart"></i> Add to Cart</>}
                  </button>
                  <button 
                    className="action-button buy-now" 
                    onClick={handleBuyNow}
                    disabled={currentStock <= 0}
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
          </div>
        </div>
        
        <div className="product-content-reviews">
          <div className="product-description-section">
            <div className="section-header">
              <h3 className="section-title">Product Information</h3>
              <div className="section-toggle">Overview</div>
            </div>
            <div className="product-description-container">
              <div className="product-detail-description">
                <h4>The best feng shui bracelets</h4>
                <p className="product-tagline">You can create a soft, cozy atmosphere in your home with this table lamp when Svallet's without shade gives a directed and decorative light.</p>
                
                <div className="spec-items-inline">
                  <h5>Specifications:</h5>
                  <p><strong>Category:</strong> {product.category_name || 'amulets'}</p>
                  <p><strong>Product Code:</strong> {product.product_code || 'AMU-001'}</p>
                  {product.material && (
                    <p><strong>Material:</strong> {product.material}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="product-reviews-section">
            <div className="section-header">
              <h3 className="section-title">Customer Reviews</h3>
              <div className="section-rating">
                <span className="review-count">{product.review_count || 0} reviews</span>
              </div>
            </div>
            
            <div className="reviews-section">
              {reviews && reviews.length > 0 ? (
                <div className="reviews-container">
                  {reviews.map((review, idx) => (
                    <div key={review.review_id || idx} className="review-item">
                      <div className="review-header">
                        <span className="reviewer-name">{review.username || 'Anonymous'}</span>
                        <div className="rating-stars">{renderStars(review.rating)}</div>
                      </div>
                      <div className="review-content">{review.review_text || 'No comment provided.'}</div>
                      <span className="review-date">{formatDate(review.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-reviews">
                  <i className="far fa-comment-alt"></i>
                  <p>No reviews yet. Be the first to review this product!</p>
                </div>
              )}
              
              <div className="review-action">
                <button 
                  className="toggle-review-form-btn" 
                  onClick={() => user ? setShowReviewForm(!showReviewForm) : navigate('/login')}
                >
                  Write a Review
                </button>
              </div>
              
              {user && showReviewForm && (
                <div className="add-review-section">
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
                    <div className="form-actions">
                      <button type="button" onClick={() => setShowReviewForm(false)} className="cancel-btn">
                        Cancel
                      </button>
                      <button type="submit" disabled={reviewLoading} className="submit-review-btn">
                        {reviewLoading ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductDetailPage; 