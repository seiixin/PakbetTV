import React, { useState, useEffect } from 'react';
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

  // New state for variants
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

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

  // New useEffect for handling variant selection
  useEffect(() => {
    // Log when the effect runs and the state values
    console.log(`[Variant Effect] Running. Size: ${selectedSize}, Color: ${selectedColor}, Product Loaded: ${!!product}`);

    if (product && product.variants && product.variants.length > 0) {
      // Extract unique sizes and colors only once when product loads
      if (availableSizes.length === 0) { 
        const sizes = [...new Set(product.variants.map(v => v.size))];
        setAvailableSizes(sizes);
        // Set default size only if not already selected
        if (!selectedSize && sizes.length > 0) {
          setSelectedSize(sizes[0]);
          // Early return here? Let the state update trigger the effect again.
          // return; // Let's try without early return first.
        }
      }
      if (availableColors.length === 0) {
        const colors = [...new Set(product.variants.map(v => v.color))];
        setAvailableColors(colors);
        // Set default color only if not already selected
        if (!selectedColor && colors.length > 0) {
          setSelectedColor(colors[0]);
          // Early return here? Let the state update trigger the effect again.
          // return; // Let's try without early return first.
        }
      }
      
      // Always attempt to find the variant based on the CURRENT selectedSize and selectedColor
      // Ensure we have valid selections before trying to update
      if (selectedSize && selectedColor) {
          console.log(`[Variant Effect] Attempting updateSelectedVariant with Size: ${selectedSize}, Color: ${selectedColor}`);
          updateSelectedVariant(selectedSize, selectedColor);
      } else {
          // Handle case where selections might be missing after product load but before defaults are set by subsequent renders
          console.log(`[Variant Effect] Skipping updateSelectedVariant: Size or Color not yet selected.`);
          // Optionally set selectedVariant to null if needed
          // setSelectedVariant(null);
      }
    }
  }, [product, selectedSize, selectedColor]);

  // Update selected variant based on size and color
  const updateSelectedVariant = (size, color) => {
    if (!product || !product.variants) return;
    console.log(`[updateSelectedVariant] Trying to find variant for size: ${size}, color: ${color}`); // Log input
    
    const variant = product.variants.find(v => 
      v.size === size && v.color === color
    );
    
    console.log(`[updateSelectedVariant] Found variant:`, variant); // Log the found variant (or undefined)
    
    if (variant) {
      setSelectedVariant(variant);
      
      // Reset quantity if it exceeds the variant's stock
      if (quantity > variant.stock) {
        setQuantity(1);
      }
    } else {
      // If no variant matches, set selectedVariant to null
      // This could be the cause of the ₱0.00/Out of Stock display
      setSelectedVariant(null);
      console.warn(`[updateSelectedVariant] No variant found for size: ${size}, color: ${color}`);
    }
  };

  // Change handler for size selection
  const handleSizeChange = (size) => {
    console.log(`[handleSizeChange] Called with size: ${size}`); // Log when size changes
    setSelectedSize(size);

    // --- NEW: Update color based on new size ---
    // Find available colors for the newly selected size
    if (product && product.variants) {
      const colorsForNewSize = [...new Set(
        product.variants
          .filter(v => v.size === size)
          .map(v => v.color)
      )];
      
      console.log(`[handleSizeChange] Available colors for size ${size}:`, colorsForNewSize);

      // If there are colors for this size and the current color isn't one of them,
      // or if no color was selected previously, select the first available color.
      if (colorsForNewSize.length > 0 && !colorsForNewSize.includes(selectedColor)) {
        const newColor = colorsForNewSize[0];
        console.log(`[handleSizeChange] Auto-selecting color: ${newColor}`);
        setSelectedColor(newColor); // This will trigger the useEffect again
      } else if (colorsForNewSize.length > 0 && selectedColor === '') {
        // Handle case where initial color wasn't set
        const newColor = colorsForNewSize[0];
        console.log(`[handleSizeChange] Setting initial color for size ${size}: ${newColor}`);
        setSelectedColor(newColor);
      }
       // If the current color IS valid for the new size, we don't need to change it.
    }
    // --- End NEW ---
  };

  // Change handler for color selection
  const handleColorChange = (color) => {
    setSelectedColor(color);
  };

  // Check if a variant is available for the given size/color combination
  const isVariantAvailable = (size, color) => {
    if (!product || !product.variants) return false;
    return product.variants.some(v => v.size === size && v.color === color && v.stock > 0);
  };

  // Get available colors for a selected size
  const getAvailableColorsForSize = (size) => {
    if (!product || !product.variants) return [];
    const variantsWithSize = product.variants.filter(v => v.size === size);
    return [...new Set(variantsWithSize.map(v => v.color))];
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
      setReviews([]); // Reset reviews on new product load
      setSelectedVariant(null); // Reset selected variant
      
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      
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
    // Check if we have variants and a selected variant
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
      size: selectedVariant ? selectedVariant.size : null,
      color: selectedVariant ? selectedVariant.color : null,
      sku: selectedVariant ? selectedVariant.sku : null
    };
    
    try {
      addToCart(itemToAdd, quantity);
      toast.success(`${quantity} x ${product.name} ${selectedVariant ? `(${selectedVariant.size}, ${selectedVariant.color})` : ''} added to cart successfully!`);
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
              src={selectedVariant?.image_url ? getFullImageUrl(selectedVariant.image_url) : (product.images?.[0]?.url ? getFullImageUrl(product.images[0].url) : '/placeholder-product.jpg')}
              alt={product.name}
              className="main-product-image"
              onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-product.jpg'}}
            />
          </div>
          
          <div className="thumbnail-container">
            {/* Primary product images */}
            {Array.isArray(product.images) && product.images.length > 0 && product.images.map((image, idx) => {
              if (!image || !image.url) return null;
              const imageUrl = getFullImageUrl(image.url);
              // Determine if this thumbnail corresponds to the currently displayed image
              const isCurrentImage = selectedVariant ? false : (idx === 0);
              return (
                <div
                  key={image.id || `image-${idx}`}
                  className={`thumbnail-item ${isCurrentImage ? 'active' : ''}`}
                  // MODIFIED: Clicking a product thumbnail should clear variant selection or select first variant?
                  // For now, let's just make it select the first variant if available, otherwise do nothing specific to image
                  onClick={() => { 
                    if (product.variants && product.variants.length > 0) {
                        setSelectedSize(product.variants[0].size);
                        setSelectedColor(product.variants[0].color);
                    } 
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
                // Determine if this thumbnail corresponds to the currently selected variant
                const isCurrentVariantImage = selectedVariant?.variant_id === variant.variant_id;
                return (
                  <div
                    key={`variant-${variant.variant_id}`}
                    className={`thumbnail-item ${isCurrentVariantImage ? 'active' : ''}`}
                    // MODIFIED: Clicking a variant thumbnail just selects that variant
                    onClick={() => {
                      setSelectedSize(variant.size);
                      setSelectedColor(variant.color);
                    }}
                  >
                    <img
                      src={variantImageUrl}
                      alt={`${product.name} - ${variant.size} ${variant.color}`}
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

          {/* Variant Selection - Only show if product has variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="variant-selection-container">
              {/* Size Selection */}
              {availableSizes.length > 0 && (
                <div className="variant-options">
                  <label>Size:</label>
                  <div className="variant-buttons size-buttons">
                    {availableSizes.map((size) => (
                      <button
                        key={`size-${size}`}
                        className={`variant-button ${selectedSize === size ? 'selected' : 'inactive-variant'} ${
                          !getAvailableColorsForSize(size).length ? 'disabled' : ''
                        }`}
                        onClick={() => handleSizeChange(size)}
                        disabled={!getAvailableColorsForSize(size).length}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Color Selection */}
              {availableColors.length > 0 && (
                <div className="variant-options">
                  <label>Color:</label>
                  <div className="variant-buttons color-buttons">
                    {availableColors
                      .filter(color => isVariantAvailable(selectedSize, color))
                      .map((color) => (
                        <button
                          key={`color-${color}`}
                          className={`variant-button color-button ${selectedColor === color ? 'selected' : 'inactive-variant'}`}
                          onClick={() => handleColorChange(color)}
                          title={color} // Keep title for hover
                        >
                           {/* Show color text */}
                           {color} 
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

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