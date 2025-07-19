import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartData } from '../../hooks/useCart';
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
  
  // Use the new cached cart hook
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
    removingFromCart,
    updatingQuantity,
    removingSelectedItems,
    refetchCart
  } = useCartData();

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if all items are selected
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);

  const getFullImageUrl = (url) => {
    if (!url) return '/placeholder-product.jpg';
    
    if (typeof url !== 'string') {
      console.warn('URL is not a string:', url);
      return '/placeholder-product.jpg';
    }
    
    if (url.startsWith('data:')) {
      return url;
    }
    
    if (url.startsWith('http')) {
      return url;
    }
    
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    return `${API_BASE_URL}/uploads/${url}`;
  };

  const handleQuantityChange = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      await updateQuantity({
        productId: item.id || item.product_id,
        quantity: newQuantity,
        variantId: item.variant_id,
        cartId: item.cart_id
      });
    } catch (error) {
      console.error('Failed to update quantity:', error);
      setError('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (item) => {
    try {
      await removeFromCart({
        productId: item.id || item.product_id,
        variantId: item.variant_id,
        cartId: item.cart_id
      });
    } catch (error) {
      console.error('Failed to remove item:', error);
      setError('Failed to remove item');
    }
  };

  const handleToggleSelection = (item) => {
    toggleItemSelection(
      item.id || item.product_id, 
      item.variant_id, 
      item.cart_id
    );
  };

  const handleRemoveSelected = async () => {
    if (getSelectedCount() === 0) {
      setError('No items selected for removal');
      return;
    }
    
    try {
      await removeSelectedItems();
      setError(null);
    } catch (err) {
      console.error('Failed to remove selected items:', err);
      setError('Failed to remove selected items');
    }
  };

  const formatPrice = (price) => {
    if (isNaN(price)) return '₱--.--';
    return '₱' + parseFloat(price).toFixed(2);
  };

  const calculateDiscountedPrice = (item) => {
    if (item.discount_percentage && item.discounted_price > 0) { 
      return parseFloat(item.discounted_price);
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
    
    const selectedItems = cartItems.filter(item => item.selected);
    console.log('Selected items for checkout:', selectedItems.length);
    
    try {
      localStorage.setItem('checkoutItems', JSON.stringify(selectedItems));
    } catch (err) {
      console.error('Failed to save checkout items:', err);
    }
    
    navigate('/checkout', { state: { items: selectedItems } });
  };

  const handleContinueShopping = () => {
    navigate('/shop');
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
                onChange={() => handleToggleSelection(item)}
              />
            </div>
            <div className="cart-item-product-new">
              <img 
                src={getFullImageUrl(item.image_url)} 
                alt={item.name}
                className="cart-item-image-new"
                onError={(e) => {
                  e.target.onerror = null;
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
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                  disabled={item.quantity <= 1 || updatingQuantity}
                >
                  -
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 1)}
                  min="1"
                  max={item.stock_quantity || 99}
                  disabled={updatingQuantity}
                />
                <button 
                  className="cart-quantity-btn-new" 
                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                  disabled={item.quantity >= (item.stock_quantity || 99) || updatingQuantity}
                >
                  +
                </button>
              </div>
            </div>
            <div className="cart-item-actions-new">
              <button 
                className="cart-delete-button-new"
                onClick={() => handleRemoveItem(item)}
                disabled={removingFromCart}
              >
                {removingFromCart ? 'Removing...' : 'Delete'}
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
            onChange={() => handleToggleSelection(item)}
          />
        </div>
        <div className="cart-item-product-new">
          <img 
            src={getFullImageUrl(item.image_url)} 
            alt={item.name}
            className="cart-item-image-new"
            onError={(e) => {
              e.target.onerror = null;
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
          </div>
        </div>
        <div className="cart-item-unit-price-new">
          <span className="cart-current-price-new">{formatPrice(displayPrice)}</span>
          {hasDiscount && (
            <span className="cart-original-price-new">{formatPrice(item.price)}</span>
          )}
        </div>
        <div className="cart-item-quantity-new">
          <div className="cart-quantity-input-new">
            <button 
              className="cart-quantity-btn-new" 
              onClick={() => handleQuantityChange(item, item.quantity - 1)}
              disabled={item.quantity <= 1 || updatingQuantity}
            >
              -
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 1)}
              min="1"
              max={item.stock_quantity || 99}
              disabled={updatingQuantity}
            />
            <button 
              className="cart-quantity-btn-new" 
              onClick={() => handleQuantityChange(item, item.quantity + 1)}
              disabled={item.quantity >= (item.stock_quantity || 99) || updatingQuantity}
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
            onClick={() => handleRemoveItem(item)}
            disabled={removingFromCart}
          >
            {removingFromCart ? 'Removing...' : 'Delete'}
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
            <div className="empty-cart-icon">🛒</div>
            <h2>Your Shopping Cart is Empty</h2>
            <p>Discover amazing products and add them to your cart to get started!</p>
            <button className="cart-continue-shopping-button" onClick={handleContinueShopping}>
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <NavBar />
      <div className="cart-shop-container">
        <div className="cart-container">
          <div className="cart-title-section">
            <h1 className="cart-main-title">Shopping Cart</h1>
            <p className="cart-subtitle">Review your items and proceed to checkout</p>
          </div>

          {error && <div className="cart-error-message">{error}</div>}
          
          {!isMobile && (
            <div className="cart-header-new">
              <div></div>
              <div className="cart-header-product">Product</div>
              <div>Unit Price</div>
              <div>Quantity</div>
              <div>Total Price</div>
              <div>Actions</div>
            </div>
          )}
          
          <div className="cart-items-new">
            {cartItems.map(item => renderCartItem(item))}
          </div>
          
          <div className="cart-footer-new">
            <div className="cart-footer-left">
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
                onClick={handleRemoveSelected}
                disabled={getSelectedCount() === 0 || removingSelectedItems}
              >
                {removingSelectedItems ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
            <div className="cart-footer-right">
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
    </div>
  );
};

export default Cart; 