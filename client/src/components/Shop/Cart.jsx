import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Shop.css';
import API_BASE_URL from '../../config';
const getFullImageUrl = (url) => {
  if (!url) {
      return '/placeholder-product.jpg'; 
  }
  if (url.startsWith('http')) {
      return url;
  }
  if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
  }
  return `${API_BASE_URL}${url}`;
};
const Cart = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);
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
  useEffect(() => {
    console.log('Cart items in Cart component:', cartItems.length, 'items');
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
    
    // Get selected items only
    const selectedItems = cartItems.filter(item => item.selected);
    
    // Navigate to checkout page with selected items
    navigate('/checkout', { 
      state: { 
        items: selectedItems
      } 
    });
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
  if (cartItems.length === 0) {
    return (
      <div className="shop-container">
        <div className="cart-container empty-cart cart-redesign">
          <h2>Your Shopping Cart is Empty</h2>
          <p>Add items to your cart to see them here.</p>
          <button className="continue-shopping-button" onClick={handleContinueShopping}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);
  return (
    <div className="shop-container">
      <div className="cart-container cart-redesign">
        {error && <div className="error-message">{error}</div>}
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
        <div className="cart-items-new">
          {cartItems.map(item => {
            const itemTotalPrice = calculateDiscountedPrice(item) * item.quantity;
            const displayPrice = calculateDiscountedPrice(item);
            const hasDiscount = item.price > displayPrice;
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
                    onError={(e) => e.target.src = '/placeholder-product.jpg'}
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
          })}
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
  );
};
export default Cart; 