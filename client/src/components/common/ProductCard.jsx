import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../../config';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  // Debug product data
  useEffect(() => {
    if (product) {
      console.log(`ProductCard for ${product.name}:`, {
        product_id: product.product_id,
        price: product.price,
        variants: product.variants,
        images: product.images
      });
    }
  }, [product]);

  const formatPrice = (price) => {
    // Ensure we have a valid number to format
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice === undefined || numPrice === null) {
      return '₱0.00';
    }
    return `₱${numPrice.toFixed(2)}`;
  };

  const getPriceDisplay = () => {
    // First check if we have variants with valid prices
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants
        .map(v => parseFloat(v.price))
        .filter(price => !isNaN(price) && price > 0);
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        // If min and max are the same, show just one price
        if (minPrice === maxPrice) {
          return formatPrice(minPrice);
        }
        
        // Otherwise show a price range
        return `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;
      }
    }
    
    // If no variants or no valid variant prices, use the product price
    return formatPrice(product.price);
  };

  const getFullImageUrl = (url) => {
    if (!url) return '/placeholder-product.jpg';
    
    // Handle base64 encoded images
    if (url.startsWith('data:')) {
      return url; // Already a full data URL
    }
    
    // Handle absolute URLs
    if (url.startsWith('http')) return url;
    
    // Handle uploads paths
    if (url.startsWith('/uploads/')) return `${API_BASE_URL}${url}`;
    
    // Handle other relative paths
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    
    // Any other format
    return `${API_BASE_URL}/uploads/${url}`;
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
    return '/placeholder-product.jpg';
  };

  const itemsSold = product.items_sold || 0;
  const displayItemsSold = itemsSold > 1000 ? `${(itemsSold / 1000).toFixed(1)}k sold` : `${itemsSold} sold`;
  
  // Calculate rating and review count
  const rating = Number(product.average_rating) || 0;
  const ratingCount = Number(product.review_count) || 0;

  // Render stars based on rating (5-star system)
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<i key={i} className="fas fa-star filled" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<i key={i} className="fas fa-star-half-alt filled" />);
      } else {
        stars.push(<i key={i} className="far fa-star empty" />);
      }
    }
    
    return stars;
  };

  return (
    <Link to={`/product/${product.product_id}`} className="product-card">
      <div className="product-card-image-container">
        <img 
          src={getPrimaryImage()} 
          alt={product.name}
          className="product-card-image"
          onError={(e) => { 
            console.error('Image load error:', e.target.src); 
            e.target.onerror = null; // Prevent infinite loop
            e.target.src = '/placeholder-product.jpg'; 
          }}
          loading="lazy"
        />
        {product.discount_percentage > 0 && (
          <div className="discount-tag">-{product.discount_percentage}%</div>
        )}
        {product.is_preferred && (
          <div className="preferred-tag">Preferred</div>
        )}
        {product.free_shipping && (
          <div className="shipping-tag">Free Shipping</div>
        )}
      </div>
      
      <div className="product-card-details">
        <h3 className="product-card-name">{product.name}</h3>
        
        <div className="product-card-price">
          {product.discount_percentage > 0 ? (
            <div className="price-with-discount">
              <span className="discounted-price">
                {getPriceDisplay()}
              </span>
              <span className="original-price">{formatPrice(product.price)}</span>
            </div>
          ) : (
            <span className="regular-price">{getPriceDisplay()}</span>
          )}
        </div>

        <div className="product-card-meta">
          <div className="rating-container">
            <span className="rating-value">{rating.toFixed(1)}</span>
            <div className="rating-stars">{renderStars()}</div>
            <span className="review-count">({ratingCount})</span>
          </div>
          <span className="items-sold">{displayItemsSold}</span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;