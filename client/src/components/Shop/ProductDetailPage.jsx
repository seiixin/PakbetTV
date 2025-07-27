import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCartData } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../hooks/useProducts';
import './ProductDetail.css';
import { createGlobalStyle } from 'styled-components';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { sanitizeHtml } from '../../utils/sanitize';
import { getFullImageUrl } from '../../utils/imageUtils';

const GlobalStyle = createGlobalStyle`
  body {
    overflow-x: hidden;
  }
`;

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartData();
  const { user, token, loading: authLoading } = useAuth();
  const { getProduct } = useProducts();
  const { data: product, isLoading: loading, error } = getProduct(id);
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
  
  // Function to check if a variant combination is available
  const isVariantCombinationAvailable = useCallback((attributes) => {
    if (!product || !product.variants) return false;
    
    return product.variants.some(variant => {
      if (!variant.attributes) return false;
      
      return Object.entries(attributes).every(([key, value]) => 
        variant.attributes[key] === value
      );
    });
  }, [product]);

  // Function to find the matching variant based on selected attributes
  const findMatchingVariant = useCallback((attributes) => {
    if (!product || !product.variants) return null;
    
    return product.variants.find(variant => 
      variant.attributes &&
      Object.entries(attributes).every(([key, value]) => 
        variant.attributes[key] === value
      )
    );
  }, [product]);

  // Handle attribute selection
  const handleAttributeChange = useCallback((attributeName, value) => {
    const newAttributes = {
      ...selectedAttributes,
      [attributeName]: value
    };
    setSelectedAttributes(newAttributes);
    
    // Find and set the matching variant
    const matchingVariant = findMatchingVariant(newAttributes);
    setSelectedVariant(matchingVariant);
    
    // Reset quantity if variant changes
    setQuantity(1);
  }, [selectedAttributes, findMatchingVariant]);

  useEffect(() => {
    if (product) {
      // Process variants and attributes
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        const options = {};
        const initialSelections = {};
        const allKeys = new Set();
        
        product.variants.forEach(variant => {
          if (variant.attributes) {
            Object.keys(variant.attributes).forEach(key => allKeys.add(key));
          }
        });

        allKeys.forEach(key => {
          const values = [...new Set(product.variants
            .map(variant => variant.attributes ? variant.attributes[key] : undefined)
            .filter(value => value !== undefined && value !== null && value !== ''))];
          
          if (values.length > 0) {
            options[key] = values;
            initialSelections[key] = values[0];
          }
        });

        setAttributeOptions(options);
        setSelectedAttributes(initialSelections);
      }

      // Set initial selected image using getPrimaryImage function
      setSelectedImageUrl(getPrimaryImage());

      // Fetch reviews
      fetchReviews(product.product_id);
    }
  }, [product]);

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

  const fetchReviews = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/product/${productId}`);
      if (response.ok) {
        const reviewsData = await response.json();
        setReviews(reviewsData);
        console.log('Reviews fetched:', reviewsData);
      } else {
        console.error('Failed to fetch reviews:', response.status);
        setReviews([]); 
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
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

    const priceInfo = getDisplayPrice(selectedVariant, product);
    const itemToAdd = {
      product_id: product.product_id,
      id: product.product_id,
      name: product.name,
      price: priceInfo.hasDiscount ? parseFloat(priceInfo.discounted) : parseFloat(priceInfo.original),
      original_price: parseFloat(priceInfo.original),
      discount_percentage: product.discount_percentage || 0,
      discounted_price: priceInfo.hasDiscount ? parseFloat(priceInfo.discounted) : 0,
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
      addToCart({ product: itemToAdd, quantity: quantity });
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
    if (!price) return '0.00';
    return Number(price).toFixed(2);
  };

  const calculateDiscountedPrice = (price, discount) => {
    if (!price || !discount || discount <= 0) return price;
    const discounted = price - (price * discount / 100);
    return discounted.toFixed(2);
  };

  const getDisplayPrice = (variant, product) => {
    // Use the new priceRange data if available
    if (product.priceRange) {
      const { minPrice, maxPrice, hasVariants } = product.priceRange;
      const discount = product.discount_percentage;
      
      // Check if we have a price range (variants with different prices)
      const hasPriceRange = hasVariants && minPrice !== maxPrice;
      
      if (hasPriceRange) {
        // Show price range (no crossed out price, but discount percentage is still shown)
        const discountPercentage = discount && discount > 0 ? (discount <= 1 ? discount * 100 : discount) : 0;
        return {
          original: `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`,
          discounted: null,
          hasDiscount: discountPercentage > 0,
          discountPercentage: discountPercentage,
          hasPriceRange: true
        };
      } else {
        // Single price (either no variants or all variants have same price)
        const basePrice = minPrice; // minPrice and maxPrice are the same
        const discountPercentage = discount && discount > 0 ? (discount <= 1 ? discount * 100 : discount) : 0;
        
        if (discountPercentage > 0 && product.discounted_price > 0) {
          return {
            original: formatPrice(basePrice),
            discounted: formatPrice(product.discounted_price),
            hasDiscount: true,
            discountPercentage: discountPercentage,
            hasPriceRange: false
          };
        }
        
        return {
          original: formatPrice(basePrice),
          discounted: null,
          hasDiscount: false,
          discountPercentage: 0,
          hasPriceRange: false
        };
      }
    }
    
    // Fallback to old logic if priceRange is not available
    const basePrice = variant ? variant.price : product.price;
    const discount = product.discount_percentage;
    
    if (discount && discount > 0 && product.discounted_price > 0) {
      // Convert decimal to percentage if needed (e.g., 0.25 -> 25)
      const discountPercentage = discount <= 1 ? discount * 100 : discount;
      return {
        original: formatPrice(basePrice),
        discounted: formatPrice(product.discounted_price),
        hasDiscount: true,
        discountPercentage: discountPercentage,
        hasPriceRange: false
      };
    }
    
    return {
      original: formatPrice(basePrice),
      discounted: null,
      hasDiscount: false,
      discountPercentage: 0,
      hasPriceRange: false
    };
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
      toast.warning('Please select a rating');
      return;
    }
    if (!newComment.trim()) {
      toast.warning('Please enter your review');
      return;
    }
    setReviewLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/product/${product.product_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: newRating, review_text: newComment })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setNewRating(0);
      setNewComment('');
      fetchReviews(product.product_id);
      setHasReviewed(true);
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  // Helper function to format product descriptions with proper bullet points
  const formatProductDescription = (description) => {
    if (!description) return '';
    
    // First, let's handle the basic structure
    let formatted = description;
    
    // Handle bullet points (lines starting with *)
    const hasBulletPoints = /^\s*\*\s+/m.test(formatted);
    
    if (hasBulletPoints) {
      // Split into sections to handle mixed content (paragraphs and lists)
      const sections = formatted.split(/\n\s*\n/);
      
      const processedSections = sections.map(section => {
        const lines = section.split('\n');
        const sectionHasBullets = lines.some(line => /^\s*\*\s+/.test(line));
        
        if (sectionHasBullets) {
          // Convert bullet points to HTML list
          const listItems = lines
            .filter(line => line.trim()) // Remove empty lines
            .map(line => {
              if (/^\s*\*\s+(.+)/.test(line)) {
                return line.replace(/^\s*\*\s+(.+)/, '<li>$1</li>');
              } else {
                // Non-bullet line in a bullet section - treat as regular text before/after list
                return `<p class="list-context">${line.trim()}</p>`;
              }
            })
            .join('');
          
          // Wrap consecutive list items in <ul> tags
          return listItems.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
        } else {
          // Regular paragraph section - preserve line breaks
          return `<p class="description-paragraph">${section.replace(/\n/g, '<br>')}</p>`;
        }
      });
      
      return processedSections.join('');
    } else {
      // No bullet points - treat as regular paragraphs with preserved line breaks
      const paragraphs = formatted.split(/\n\s*\n/);
      return paragraphs
        .filter(p => p.trim())
        .map(paragraph => `<p class="description-paragraph">${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }
  };

  // Get the primary image URL
  const getPrimaryImage = () => {
    if (product.variants && product.variants.length > 0 && product.variants[0].image_url) {
      return getFullImageUrl(product.variants[0].image_url);
    }
    if (product.images && product.images.length > 0) {
      return getFullImageUrl(product.images[0].url);
    }
    if (product.image_url) {
      return getFullImageUrl(product.image_url);
    }
    return '/ImageFallBack.png'; // Use ImageFallBack.png as fallback
  };

  // Handle image loading errors
  const handleImageError = (e) => {
    console.error('Image load error:', e.target.src);
    e.target.onerror = null; // Prevent infinite loop
    e.target.src = '/ImageFallBack.png'; // Use ImageFallBack.png when image fails to load
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

  if (loading || authLoading) {
    return (
      <div className="product-detail-page">
        <NavBar />
        <div className="loading-container">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading product details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error.message}</p>
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
                {selectedImageUrl ? (
                    <img 
                      src={selectedImageUrl} 
                      alt={product.name || "Product image"} 
                      className="main-product-image"
                      onError={handleImageError} 
                    />
                ) : (
                    <img 
                      src="/ImageFallBack.png" 
                      alt="Product image not available" 
                      className="main-product-image"
                    />
                )}
              </div>
              <div className="thumbnail-container">
                {product.images && product.images.length > 0 && product.images.map((image, index) => (
                  <div 
                    key={index}
                    className={`thumbnail-item ${selectedImageUrl === getFullImageUrl(image.url) ? 'active' : ''}`}
                    onClick={() => setSelectedImageUrl(getFullImageUrl(image.url))}
                  >
                    <img 
                      src={getFullImageUrl(image.url)} 
                      alt={`${product.name} thumbnail ${index + 1}`} 
                      onError={handleImageError}
                    />
                  </div>
                ))}
                {product.variants && product.variants.length > 0 && 
                  product.variants
                    .filter(variant => {
                      if (!variant.image_url) return false;
                      // Skip variants whose images are already in the product.images array
                      if (product.images) {
                        const variantFullUrl = getFullImageUrl(variant.image_url);
                        return !product.images.some(img => 
                          getFullImageUrl(img.url) === variantFullUrl
                        );
                      }
                      return true;
                    })
                    .map((variant, index) => (
                      <div 
                        key={`variant-${index}`}
                        className={`thumbnail-item ${selectedImageUrl === getFullImageUrl(variant.image_url) ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedImageUrl(getFullImageUrl(variant.image_url));
                          if (variant.attributes) {
                            setSelectedAttributes(variant.attributes);
                          }
                        }}
                      >
                        <img 
                          src={getFullImageUrl(variant.image_url)} 
                          alt={`${product.name} variant ${index + 1}`} 
                          onError={handleImageError}
                        />
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
                {(() => {
                  const priceInfo = getDisplayPrice(selectedVariant, product);
                  
                  if (priceInfo.hasPriceRange) {
                    // Show price range (no crossed out price, but discount badge is still shown)
                    return (
                      <>
                        <div className="price-range">
                          {priceInfo.original}
                        </div>
                        {priceInfo.hasDiscount && (
                          <div className="discount-badge">
                            {priceInfo.discountPercentage}% OFF
                          </div>
                        )}
                      </>
                    );
                  } else if (priceInfo.hasDiscount) {
                    // Show discounted price with crossed out original price (single price product)
                    return (
                      <>
                        <div className="discounted-price">
                          <span className="price-currency">₱</span>
                          {priceInfo.discounted}
                        </div>
                        <div className="original-price">
                          <span className="price-currency">₱</span>
                          {priceInfo.original}
                        </div>
                        <div className="discount-badge">
                          {priceInfo.discountPercentage}% OFF
                        </div>
                      </>
                    );
                  }
                  
                  // Show regular price
                  return (
                    <div className="regular-price">
                      <span className="price-currency" style={{ fontSize: '30px'}}>₱</span>
                      {priceInfo.original}
                    </div>
                  );
                })()}
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
              {product.description && <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatProductDescription(product.description)) }} />}
              
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
                    
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={() => {
                          setShowReviewForm(false);
                          setNewRating(0);
                          setNewComment('');
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