import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import API_BASE_URL from '../../config';
import { getFullImageUrl } from '../../utils/imageUtils';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const [isAdded, setIsAdded] = useState(false);
  const { addToCart } = useCart();

  // Debug product data
  useEffect(() => {
    if (product) {
      console.log(`ProductCard for ${product.name}:`, {
        product_id: product.product_id,
        price: product.price,
        variants: product.variants,
        stock: product.stock,
        base_stock: product.base_stock,
        has_variants: product.has_variants,
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

  // Get the display price using the new priceRange data
  const getDisplayPrice = () => {
    // Use the new priceRange data if available
    if (product.priceRange) {
      const { minPrice, maxPrice, hasVariants } = product.priceRange;
      
      if (hasVariants && minPrice !== maxPrice) {
        // Show price range for products with variants
        return `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;
      } else {
        // Show single price (either minPrice or maxPrice, they're the same)
        return formatPrice(minPrice);
      }
    }
    
    // Fallback to old logic if priceRange is not available
    if (product.discounted_price && product.discounted_price > 0) {
      return formatPrice(product.discounted_price);
    }
    return formatPrice(product.price || 0);
  };

  // Get the original price for display when there's a discount (only for single price products)
  const getOriginalPrice = () => {
    // Only show original price if there's a discount AND no price range (single price product)
    if (product.discounted_price && product.discounted_price > 0 && 
        product.priceRange && !product.priceRange.hasVariants) {
      return formatPrice(product.price || 0);
    }
    return null;
  };

  const getPriceDisplay = () => {
    // Use the new priceRange data if available
    if (product.priceRange) {
      const { minPrice, maxPrice, hasVariants } = product.priceRange;
      
      if (hasVariants && minPrice !== maxPrice) {
        // Show price range for products with variants
        return `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;
      } else {
        // Show single price
        return formatPrice(minPrice);
      }
    }
    
    // Fallback to old logic if priceRange is not available
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
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

  const handleAddToCart = (e) => {
    e.preventDefault(); // Prevent navigation to product page
    
    try {
      // Check stock before attempting to add
      const stockQuantity = product.stock;
      console.log('Stock check for', product.name, ':', {
        stock: stockQuantity,
        base_stock: product.base_stock,
        has_variants: product.has_variants
      });

      if (stockQuantity <= 0) {
        toast.error('This item is out of stock');
        return;
      }

      const itemToAdd = {
        product_id: product.product_id,
        id: product.product_id,
        name: product.name,
        price: product.discounted_price > 0 ? product.discounted_price : product.price,
        original_price: product.price,
        discount_percentage: product.discount_percentage || 0,
        discounted_price: product.discounted_price || 0,
        image_url: getPrimaryImage(),
        stock: stockQuantity,
        category_id: product.category_id,
        category_name: product.category_name,
        product_code: product.product_code
      };

      addToCart(itemToAdd, 1)
        .then(() => {
          toast.success(`${product.name} added to cart successfully!`);
          // Show visual feedback
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), 1500);
        })
        .catch((error) => {
          const errorMessage = error?.response?.data?.message || 'Failed to add item to cart';
          toast.error(errorMessage);
          console.error('Error adding to cart:', error);
        });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  return (
    <Link to={`/product/${product.product_id}`} className="product-card">
      <div className="product-card-image-container">
        <img 
          src={getPrimaryImage()} 
          alt={product.name}
          className="product-card-image"
          onError={handleImageError}
          loading="lazy"
        />
        {product.discount_percentage > 0 && (
          <div className="discount-tag">-{(product.discount_percentage <= 1 ? product.discount_percentage * 100 : product.discount_percentage).toFixed(0)}%</div>
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
          {(() => {
            // Check if we have a price range (variants with different prices)
            const hasPriceRange = product.priceRange && product.priceRange.hasVariants && 
                                 product.priceRange.minPrice !== product.priceRange.maxPrice;
            
            // Check if we have a discount
            const hasDiscount = product.discounted_price > 0;
            
            if (hasPriceRange) {
              // Show price range (no crossed out price, but discount tag is still shown)
              return (
                <div className="price-with-range">
                  <span className="price-range">
                    {getDisplayPrice()}
                  </span>
                </div>
              );
            } else if (hasDiscount) {
              // Show discounted price with crossed out original price (single price product)
              return (
            <div className="price-with-discount">
              <span className="discounted-price">
                {getDisplayPrice()}
              </span>
              <span className="original-price">{getOriginalPrice()}</span>
            </div>
              );
            } else {
              // Show regular price
              return (
            <span className="regular-price">{getDisplayPrice()}</span>
              );
            }
          })()}
          <button 
            className={`add-to-cart-icon ${isAdded ? 'added' : ''}`}
            onClick={handleAddToCart}
            disabled={product.stock_quantity <= 0}
          >
            <i className={`fas ${isAdded ? 'fa-check' : 'fa-shopping-cart'}`}></i>
          </button>
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