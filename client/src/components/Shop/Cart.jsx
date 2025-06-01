import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Cart.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';

const Cart = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    cartItems, 
    loading,
    removeFromCart,
    removeSelectedItems,
    updateQuantity,
    toggleItemSelection,
    toggleSelectAll,
    getTotalPrice,
    getSelectedCount,
    createOrder,
    processPayment
  } = useCart();

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getFullImageUrl = (url) => {
    if (!url) return '/placeholder-product.jpg';
    
    // Type check to prevent errors
    if (typeof url !== 'string') {
      console.warn('URL is not a string:', url);
      return '/placeholder-product.jpg';
    }
    
    // Handle base64 encoded images (longblob from database)
    if (url.startsWith('data:')) {
      return url; // Already a full data URL
    }
    
    // Handle absolute URLs
    if (url.startsWith('http')) {
      return url;
    }
    
    // Handle uploads paths
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Handle other relative paths
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Any other format
    return `${API_BASE_URL}/uploads/${url}`;
  };

  useEffect(() => {
    console.log('Cart items in Cart component:', cartItems.length, 'items');
    
    // If cartItems is empty but localStorage has items, this will ensure they're loaded
    if (cartItems.length === 0) {
      try {
        const savedCart = localStorage.getItem('cartItems');
        if (savedCart) {
          console.log('Found saved cart in localStorage, length:', JSON.parse(savedCart).length);
        }
      } catch (err) {
        console.error('Error checking localStorage cart:', err);
      }
    }
  }, [cartItems]);

  const formatPrice = (price) => {
    if (isNaN(price)) return '₱--.--';
    return '₱' + parseFloat(price).toFixed(2);
  };

  const calculateDiscountedPrice = (item) => {
    if (item.discount_percentage) { 
      return parseFloat(item.price) * (1 - (item.discount_percentage / 100));
    }
    return parseFloat(item.price);
  };

  const handleCheckout = async () => {
    console.log('Checkout initiated, user:', user);
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    
    if (getSelectedCount() === 0) {
      setError('Please select at least one item to checkout');
      return;
    }
    
    // Get only selected items for checkout
    const selectedItems = cartItems.filter(item => item.selected);
    console.log('Selected items for checkout:', selectedItems.length);
    
    // Save selected items to localStorage for persistence during checkout
    try {
      localStorage.setItem('checkoutItems', JSON.stringify(selectedItems));
    } catch (err) {
      console.error('Failed to save checkout items:', err);
    }
    
    // Navigate to the checkout page
    navigate('/checkout', { state: { items: selectedItems } });
  };

  const handleContinueShopping = () => {
    navigate('/shop');
  };

  const handleDeleteSelected = () => {
    if (getSelectedCount() > 0) {
      if (window.confirm(`Are you sure you want to remove ${getSelectedCount()} selected item(s)?`)) {
        removeSelectedItems(); 
      }
    }
  };

  const renderCartItem = (item) => {
    const itemTotalPrice = calculateDiscountedPrice(item) * item.quantity;
    const displayPrice = calculateDiscountedPrice(item);
    const hasDiscount = item.price > displayPrice;

    if (isMobile) {
    return (
        <div key={item.variant_id || item.id} className="cart-item-new">
          <div className="cart-item-mobile-row main">
            <div className="cart-item-select-new">
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => toggleItemSelection(item.product_id, item.variant_id)}
              />
            </div>
            <div className="cart-item-product-new">
              <img 
                src={getFullImageUrl(item.image_url)} 
                alt={item.name}
                className="cart-item-image-new"
                onError={(e) => {
                  console.log('Image failed to load:', e.target.src);
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = '/placeholder-product.jpg'; 
                }}
              />
              <div className="cart-item-details-new">
                <p className="cart-item-name-new">{item.name}</p>
                {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                  <div className="cart-item-variation-new">
                    {Object.entries(item.variant_attributes)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ')}
                  </div>
                )}
                <div className="cart-item-price-mobile">
                  {hasDiscount && (
                    <span className="cart-original-price-new">{formatPrice(item.price)}</span>
                  )}
                  <span className="cart-current-price-new">{formatPrice(displayPrice)} each</span>
                </div>
              </div>
            </div>
            <div className="cart-item-total-price-mobile">
              {formatPrice(itemTotalPrice)}
            </div>
          </div>
          <div className="cart-item-mobile-row actions">
            <div className="cart-item-quantity-new">
              <div className="cart-quantity-input-new">
                <button 
                  className="cart-quantity-btn-new" 
                  onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variant_id)}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1, item.variant_id)}
                  min="1"
                  max={item.stock_quantity || 99}
                />
                <button 
                  className="cart-quantity-btn-new" 
                  onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variant_id)}
                  disabled={item.quantity >= (item.stock_quantity || 99)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="cart-item-actions-new">
              <button 
                className="cart-delete-button-new"
                onClick={() => removeFromCart(item.product_id, item.variant_id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Desktop layout
              return (
                <div key={item.variant_id || item.id} className="cart-item-new">
                  <div className="cart-item-select-new">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItemSelection(item.product_id, item.variant_id)}
                    />
                  </div>
                  <div className="cart-item-product-new">
                    <img 
                      src={getFullImageUrl(item.image_url)} 
                      alt={item.name}
                      className="cart-item-image-new"
                      onError={(e) => {
                        console.log('Image failed to load:', e.target.src);
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.src = '/placeholder-product.jpg'; 
                      }}
                    />
                    <div className="cart-item-details-new">
                      <p className="cart-item-name-new">{item.name}</p>
                      {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                          <div className="cart-item-variation-new">
                            Variations: {Object.entries(item.variant_attributes)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </div>
                      )}
                    </div>
                  </div>
                  <div className="cart-item-unit-price-new">
                    {hasDiscount && (
                      <span className="cart-original-price-new">{formatPrice(item.price)}</span>
                    )}
                    <span className="cart-current-price-new">{formatPrice(displayPrice)}</span>
                  </div>
                  <div className="cart-item-quantity-new">
                    <div className="cart-quantity-input-new">
                      <button 
                        className="cart-quantity-btn-new" 
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variant_id)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1, item.variant_id)}
                        min="1"
                        max={item.stock_quantity || 99}
                      />
                      <button 
                        className="cart-quantity-btn-new" 
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variant_id)}
                        disabled={item.quantity >= (item.stock_quantity || 99)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-total-price-new">
                    {formatPrice(itemTotalPrice)}
                  </div>
                  <div className="cart-item-actions-new">
                    <button 
                      className="cart-delete-button-new"
                      onClick={() => removeFromCart(item.product_id, item.variant_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
  };

  if (loading) {
    return (
      <div className="cart-page">
        <NavBar />
        <div className="cart-shop-container">
          <div className="cart-loading">
            <div className="cart-loading-spinner"></div>
            <p>Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <NavBar />
        <div className="cart-shop-container">
          <div className="cart-empty-cart">
            <h2>Your Shopping Cart is Empty</h2>
            <p>Add items to your cart to see them here.</p>
            <button className="cart-continue-shopping-button" onClick={handleContinueShopping}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);

  return (
    <div className="cart-page">
      <NavBar />
      <div className="cart-shop-container">
        <div className="cart-container cart-redesign">
          {error && <div className="cart-error-message">{error}</div>}
          
          {/* Desktop header - hidden on mobile */}
          {!isMobile && (
            <div className="cart-header-new">
              <div className="cart-header-select">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(!allSelected)}
                  id="cart-select-all-header"
                />
              </div>
              <div className="cart-header-product">Product</div>
              <div className="cart-header-unit-price">Unit Price</div>
              <div className="cart-header-quantity">Quantity</div>
              <div className="cart-header-total-price">Total Price</div>
              <div className="cart-header-actions">Actions</div>
            </div>
          )}
          
          <div className="cart-items-new">
            {cartItems.map(item => renderCartItem(item))}
          </div>
          
          <div className="cart-footer-new">
             <div className="cart-footer-select-all-new">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(!allSelected)}
                  id="cart-select-all-footer"
                />
                <label htmlFor="cart-select-all-footer">Select All ({cartItems.length})</label>
             </div>
             <button 
               className="cart-footer-delete-button-new"
               onClick={handleDeleteSelected}
               disabled={getSelectedCount() === 0}
             >
               Delete
             </button>
             <div className="cart-footer-spacer-new"></div>
             <div className="cart-footer-summary-new">
               Total ({getSelectedCount()} item{getSelectedCount() !== 1 ? 's' : ''}): 
               <span className="cart-footer-total-price-new">{formatPrice(getTotalPrice())}</span>
             </div>
             <button 
                className="cart-checkout-button-new"
                onClick={handleCheckout}
                disabled={checkoutLoading || getSelectedCount() === 0}
              >
                {checkoutLoading ? 'Processing...' : 'Check Out'}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart; 