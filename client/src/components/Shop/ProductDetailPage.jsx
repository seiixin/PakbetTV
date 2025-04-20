import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Shop.css';
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  .inactive-variant {
    border: 1px solid #ccc !important;
    background-color: #f8f8f8 !important;
    color: #555 !important;
    min-width: 40px; /* Ensure minimum width */
    padding: 5px 10px;
  }
  .color-button.inactive-variant {
  }
  .quantity-input input {
      border: 1px solid #ccc !important;
      text-align: center;
  }
  /* --- NEW: Active variant button style --- */
  .variant-button.selected {
      background-color: #800000 !important; /* Maroon */
      color: #ffffff !important; /* White */
      border: 1px solid #800000 !important; /* Explicitly set border */
      min-width: 40px; /* Ensure minimum width */
      padding: 5px 10px;
  }
  /* --- NEW: Layout Styles --- */
  .variant-options {
      display: flex; 
      align-items: center; /* Vertically align label and buttons */
      margin-bottom: 15px; /* Space between Size/Color sections */
  }
  .variant-options label {
      margin-right: 10px; /* Space between label and buttons */
      min-width: 50px; /* Give label some space */
      font-weight: bold;
  }
  .variant-buttons {
      display: flex; /* Align buttons horizontally */
      flex-wrap: wrap; /* Allow wrapping if many options */
      gap: 5px; /* Space between buttons */
  }
  /* --- REMOVE or adjust color-button specific size overrides if text is shown --- */
  /* 
  .color-button {
    min-width: 30px !important; 
    min-height: 30px;
    padding: 0;
    text-align: center;
    line-height: 30px; 
    font-size: 0.8em; 
  }
  */
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

  // --- NEW State for Dynamic Attributes ---
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [attributeOptions, setAttributeOptions] = useState({});
  const [selectedAttributes, setSelectedAttributes] = useState({});
  // --- END NEW State ---

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

  // --- NEW: useEffect to set default image from first variant ---
  useEffect(() => {
    if (product) {
      let defaultImageUrl = null;
      
      // First priority: Use first variant's image if available
      if (product.variants && product.variants.length > 0 && product.variants[0].image_url) {
        defaultImageUrl = getFullImageUrl(product.variants[0].image_url);
        console.log('Using first variant image as default:', defaultImageUrl);
      }
      // Second priority: Use product's first image if available
      else if (product.images && product.images.length > 0) {
        defaultImageUrl = getFullImageUrl(product.images[0].url);
        console.log('Using product image as default:', defaultImageUrl);
      }
      
      if (defaultImageUrl) {
        setSelectedImageUrl(defaultImageUrl);
        
        // If we have variants with this image, select that variant
        if (product.variants) {
          const matchingVariant = product.variants.find(v => 
            v.image_url && getFullImageUrl(v.image_url) === defaultImageUrl
          );
          
          if (matchingVariant && matchingVariant.attributes) {
            // Set selected attributes based on first variant
            setSelectedAttributes(matchingVariant.attributes);
            console.log('Setting initial attributes from first variant:', matchingVariant.attributes);
          }
        }
      }
    }
  }, [product]);

  // --- MODIFIED: useEffect for handling variant selection (now depends on selectedAttributes) ---
  useEffect(() => {
    // Update the selected variant whenever the selected attributes change
    // Ensure product and its variants are loaded, and we have attributes selected
    if (product && product.variants && product.variants.length > 0 && Object.keys(selectedAttributes).length > 0) {
        console.log('[Attribute Effect] Updating variant based on selected attributes:', selectedAttributes);
        updateSelectedVariant(); // Pass no args, it will use selectedAttributes state
    }
  }, [product, selectedAttributes]); // Depend on product and the whole selectedAttributes object

  // --- NEW/REWRITTEN: Update selected variant based on the selectedAttributes state ---
  const updateSelectedVariant = () => {
    if (!product || !product.variants) return;

    console.log(`[updateSelectedVariant] Finding variant matching:`, selectedAttributes);

    const variant = product.variants.find(v => {
        // Check if EVERY selected attribute matches the variant's attributes
        return Object.entries(selectedAttributes).every(([key, value]) => {
            return v.attributes && v.attributes[key] === value;
        });
    });

    console.log(`[updateSelectedVariant] Found variant:`, variant);

    if (variant) {
      setSelectedVariant(variant); // Set the found variant state
      // Reset quantity if it exceeds the variant's stock
      if (quantity > variant.stock) {
        setQuantity(1);
      }
    } else {
      setSelectedVariant(null); // No matching variant found
      console.warn(`[updateSelectedVariant] No variant found matching attributes:`, selectedAttributes);
    }
  };

  // --- NEW: Generic handler for attribute selection changes ---
  const handleAttributeChange = (attributeName, value) => {
    console.log(`[handleAttributeChange] Setting ${attributeName} to ${value}`);
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
    // The useEffect depending on selectedAttributes will handle finding the variant
  };

  // --- Helper to check availability (can be enhanced later) ---
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
      setReviews([]);
      setSelectedVariant(null);
      // --- Reset NEW state --- 
      setAttributeOptions({});
      setSelectedAttributes({});
      // --- End Reset ---
      
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      const data = await response.json();
      console.log('Product data from API:', data);

      // Basic parsing (remains similar)
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
      
      // --- NEW: Process Variants for Dynamic Attributes --- 
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        const options = {}; // To build attributeOptions
        const initialSelections = {}; // To build initial selectedAttributes

        // First pass: Find all unique attribute keys
        const allKeys = new Set();
        data.variants.forEach(variant => {
          if (variant.attributes) {
            Object.keys(variant.attributes).forEach(key => allKeys.add(key));
          }
        });

        // Second pass: Find unique values for each key and set initial selection
        allKeys.forEach(key => {
          const values = [...new Set(data.variants
            .map(variant => variant.attributes ? variant.attributes[key] : undefined)
            .filter(value => value !== undefined && value !== null && value !== '')) // Filter out empty/null values
          ];
          if (values.length > 0) {
            options[key] = values; // Store available options
            initialSelections[key] = values[0]; // Select the first option by default
          }
        });

        setAttributeOptions(options);
        // We don't set selectedAttributes here anymore since we'll do it in the useEffect based on the first variant's image
        console.log('Determined Attribute Options:', options);
        
        // Add parsed variants to product object (API already returns parsed attributes)
        parsedProduct.variants = data.variants; 

      } else {
        parsedProduct.variants = [];
      }
      // --- END NEW Variant Processing ---
      
      setProduct(parsedProduct);
      
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
    // Check if we have variants and a selected variant
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
      // Use variant price if available, otherwise use product price
      price: selectedVariant ? selectedVariant.price : product.price,
      // Use variant image if available
      image_url: selectedVariant && selectedVariant.image_url 
        ? getFullImageUrl(selectedVariant.image_url)
        : getFullImageUrl(product.image_url || (product.images && product.images[0] ? product.images[0].url : null)),
      stock_quantity: selectedVariant ? selectedVariant.stock : product.stock_quantity,
      category_id: product.category_id,
      category_name: product.category_name,
      product_code: product.product_code,
      // Add variant information if available
      variant_id: selectedVariant ? selectedVariant.variant_id : null,
      variant_attributes: selectedVariant ? selectedVariant.attributes : null
    };
    
    try {
      addToCart(itemToAdd, quantity);
      
      // Generate a formatted variant name for the toast
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
    
    // Add to cart first (reusing handleAddToCart logic)
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

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  const getFullImageUrl = (url) => {
    if (!url) {
        console.warn('[getFullImageUrl] URL is missing, returning placeholder.');
        return '/placeholder-product.jpg';
    }
    // If URL already starts with http, it's absolute, return as is
    if (url.startsWith('http')) {
        return url;
    }
    // If URL starts with /, prepend only the origin
    if (url.startsWith('/')) {
        return `http://localhost:5000${url}`;
    }
    // Otherwise, it's likely a relative path like 'uploads/...', prepend origin + /
    console.log(`[getFullImageUrl] Prepending origin to relative path: ${url}`);
    return `http://localhost:5000/${url}`;
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

  // Calculate current price based on selected variant or product
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  // Calculate current stock based on selected variant or product
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock_quantity;

  // --- Main JSX Return ---
  return (
    <>
    <GlobalStyle />
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
              src={selectedVariant?.image_url ? getFullImageUrl(selectedVariant.image_url) : (selectedImageUrl || (product.images?.[0]?.url ? getFullImageUrl(product.images[0].url) : '/placeholder-product.jpg'))}
              alt={product.name}
              className="main-product-image"
              onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-product.jpg'}}
            />
          </div>
          
          <div className="thumbnail-container">
            {/* Primary product images */}
            {Array.isArray(product.images) && product.images.length > 0 && product.images.map((image, idx) => {
              const imageUrl = getFullImageUrl(image.url);
              const isBaseImageActive = !selectedVariant && idx === 0; // Active if no variant selected and it's the first image
              return (
                <div
                  key={image.id || `image-${idx}`}
                  className={`thumbnail-item ${isBaseImageActive ? 'active' : ''}`}
                  onClick={() => {
                    // Clicking base image could reset selections or select first default variant
                    // Let's try resetting selections for now
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
            
            {/* Variant images */}
            {Array.isArray(product.variants) && product.variants
              .filter(variant => variant.image_url)
              .map((variant, idx) => {
                const variantImageUrl = getFullImageUrl(variant.image_url);
                const isCurrentVariantImage = selectedVariant?.variant_id === variant.variant_id;
                return (
                  <div
                    key={`variant-${variant.variant_id}`}
                    className={`thumbnail-item ${isCurrentVariantImage ? 'active' : ''}`}
                    // MODIFIED: Clicking variant thumbnail sets all its attributes
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
        
        {/* Info and Actions Section */}
        <div className="product-detail-info-actions">
          <h1 className="product-detail-name">{product.name}</h1>
          
          {/* Price Section - Use variant price if selected */}
          <div className="product-detail-price-section">
            {product.discount_percentage > 0 ? (
              <>
                <span className="discounted-price">
                  {formatPrice(calculateDiscountedPrice(currentPrice, product.discount_percentage))}
                </span>
                <span className="original-price">{formatPrice(currentPrice)}</span>
                <span className="discount-badge">
                  {product.discount_percentage}% OFF
                </span>
              </>
            ) : (
              <span className="regular-price">{formatPrice(currentPrice)}</span>
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
          
          {/* Variant Selection - MODIFIED TO BE DYNAMIC */}
          {Object.keys(attributeOptions).length > 0 && (
            <div className="variant-selection-container">
              {Object.entries(attributeOptions).map(([attributeName, availableValues]) => (
                <div key={attributeName} className="variant-options">
                  <label>{attributeName}:</label>
                  <div className="variant-buttons">
                    {availableValues.map((value) => (
                      <button
                        key={`${attributeName}-${value}`}
                        className={`variant-button ${selectedAttributes[attributeName] === value ? 'selected' : 'inactive-variant'}`}
                        onClick={() => handleAttributeChange(attributeName, value)}
                        // Add logic here later to disable buttons for unavailable combinations if needed
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* --- END DYNAMIC Variant Selection --- */}

          {/* Shipping Info */}
          <div className="product-detail-shipping">
            <i className="fas fa-truck"></i>
            <span>Free shipping on orders over ₱1000</span>
          </div>
          
          {/* Stock Status & Actions - Use variant stock if selected */}          
          {currentStock > 0 ? (
          <div className="product-detail-actions">
              {/* Stock Display */}          
              <div className="quantity-control-wrapper">
                <span className="stock-available">
                  {currentStock < 10 ? 
                    <><i className="fas fa-exclamation-circle"></i> Only {currentStock} left!</> : 
                    <><i className="fas fa-check-circle"></i> In Stock ({currentStock} available)</>}
                </span>
                {/* Quantity Input - Ensure borders via CSS */}          
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
              
              {/* Action Buttons */}          
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
      
      {/* Description Container - MODIFIED */}
      <div className="product-description-container">
        <h3>Product Description</h3>
        <div className="product-detail-description">
          {product.description || 'No description available.'}
          
          {/* --- ADDED Specifications Info Here --- */}
          <div className="spec-items-inline mt-4"> {/* Added mt-4 for spacing */}
            <h5>Specifications:</h5> {/* Optional subheading */}
             <p><strong>Category:</strong> {product.category_name || 'N/A'}</p>
             <p><strong>Product Code:</strong> {product.product_code || 'N/A'}</p>
              {/* Add other specs here if they return, e.g., Material */}
             {product.material && (
                 <p><strong>Material:</strong> {product.material}</p>
             )}
          </div>
          {/* --- END Specifications Info --- */}

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
    </>
  );
};

export default ProductDetailPage; 