import React from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../../config';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const formatPrice = (price) => {
    if (!price) return '₱0.00';
    return `₱${Number(price).toFixed(2)}`;
  };

  const getFullImageUrl = (url) => {
    if (!url) return '/placeholder-product.jpg';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
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

  // Render stars based on rating
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fas fa-star ${i <= rating ? 'filled' : 'empty'}`}
        />
      );
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
          onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.jpg'; }}
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
                {formatPrice(product.price - (product.price * product.discount_percentage / 100))}
              </span>
              <span className="original-price">{formatPrice(product.price)}</span>
            </div>
          ) : (
            <span className="regular-price">{formatPrice(product.price)}</span>
          )}
        </div>

        <div className="product-card-meta">
          <div className="rating-container">
            {rating > 0 && (
              <>
                <span className="rating-value">{rating.toFixed(1)}</span>
                <div className="rating-stars">{renderStars()}</div>
                <span className="review-count">({ratingCount})</span>
              </>
            )}
          </div>
          <span className="items-sold">{displayItemsSold}</span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard; 