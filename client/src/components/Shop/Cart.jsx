import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Shop.css';

const Cart = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { 
    cartItems, 
    loading,
    removeFromCart,
    updateQuantity,
    toggleItemSelection,
    toggleSelectAll,
    getTotalPrice,
    getSelectedCount,
    createOrder,
    processPayment
  } = useCart();
  
  // Log cart items when they change
  useEffect(() => {
    console.log('Cart items in Cart component:', cartItems.length, 'items');
  }, [cartItems]);
  
  // Format currency
  const formatPrice = (price) => {
    return '₱' + parseFloat(price).toFixed(2);
  };
  
  // Calculate discounted price
  const calculateDiscountedPrice = (item) => {
    if (item.is_flash_deal && item.discount_percentage) {
      return parseFloat(item.price) * (1 - (item.discount_percentage / 100));
    }
    return parseFloat(item.price);
  };
  
  // Handle checkout process
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
    
    setCheckoutLoading(true);
    setError(null);
    
    try {
      // Create order
      const orderResult = await createOrder(user.id);
      
      // Process payment
      const paymentResult = await processPayment(
        orderResult.order_id, 
        user.email || 'customer@example.com'
      );
      
      console.log('Payment initiated, redirecting to:', paymentResult.payment_url);
      
      // Redirect directly to Dragonpay instead of showing intermediate screen
      window.location.href = paymentResult.payment_url;
      
    } catch (err) {
      setError(err.message || 'Failed to process checkout');
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(false);
    }
  };
  
  // Continue shopping
  const handleContinueShopping = () => {
    navigate('/shop');
  };
  
  if (cartItems.length === 0) {
    return (
      <div className="shop-container">
        <div className="cart-container empty-cart">
          <h2>Your Shopping Cart is Empty</h2>
          <p>Add items to your cart to see them here.</p>
          <button className="continue-shopping-button" onClick={handleContinueShopping}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }
  
  // Check if all items are selected
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);
  
  return (
    <div className="shop-container">
      <div className="cart-container">
        <h1>Shopping Cart</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="cart-header">
          <div className="cart-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => toggleSelectAll(!allSelected)}
              id="select-all"
            />
            <label htmlFor="select-all">Select All</label>
          </div>
          <div className="cart-header-price">Price</div>
          <div className="cart-header-quantity">Quantity</div>
          <div className="cart-header-total">Total</div>
          <div className="cart-header-action">Action</div>
        </div>
        
        <div className="cart-items">
          {cartItems.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-select">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleItemSelection(item.id)}
                />
              </div>
              
              <div className="cart-item-info">
                <div 
                  className="cart-item-image"
                  style={{ backgroundImage: `url(http://localhost:5000${item.image_url})` }}
                ></div>
                <div className="cart-item-details">
                  <h3 className="cart-item-name">{item.name}</h3>
                  <div className="cart-item-code">Product Code: {item.product_code}</div>
                  {(item.size || item.color) && (
                    <div className="cart-item-variant">
                      Variant: {item.size && <span className="variant-size">{item.size}</span>}
                      {item.size && item.color && <span> / </span>}
                      {item.color && <span className="variant-color">{item.color}</span>}
                    </div>
                  )}
                  {item.is_flash_deal && item.discount_percentage > 0 && (
                    <div className="discount-badge">SALE {item.discount_percentage}% OFF</div>
                  )}
                </div>
              </div>
              
              <div className="cart-item-price">
                {item.is_flash_deal && item.discount_percentage ? (
                  <>
                    <span className="original-price">{formatPrice(item.price)}</span>
                    <span className="discounted-price">
                      {formatPrice(calculateDiscountedPrice(item))}
                    </span>
                  </>
                ) : (
                  <span className="regular-price">{formatPrice(item.price)}</span>
                )}
              </div>
              
              <div className="cart-item-quantity">
                <div className="quantity-input">
                  <button 
                    className="quantity-btn" 
                    onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant_id)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1, item.variant_id)}
                    min="1"
                    max={item.stock || 10}
                  />
                  <button 
                    className="quantity-btn" 
                    onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant_id)}
                    disabled={item.quantity >= (item.stock || 10)}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="cart-item-total">
                {formatPrice(
                  (item.is_flash_deal && item.discount_percentage 
                    ? calculateDiscountedPrice(item) 
                    : item.price) * item.quantity
                )}
              </div>
              
              <div className="cart-item-action">
                <button 
                  className="remove-button"
                  onClick={() => removeFromCart(item.id, item.variant_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="cart-footer">
          <div className="cart-summary">
            <div className="selected-items">
              Selected Items: <strong>{getSelectedCount()}</strong>
            </div>
            <div className="cart-total">
              Total: {formatPrice(getTotalPrice())}
            </div>
          </div>
          
          <div className="cart-actions">
            <button 
              className="continue-shopping-button"
              onClick={handleContinueShopping}
            >
              Continue Shopping
            </button>
            <button 
              className="checkout-button"
              onClick={handleCheckout}
              disabled={checkoutLoading || getSelectedCount() === 0}
            >
              {checkoutLoading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart; 