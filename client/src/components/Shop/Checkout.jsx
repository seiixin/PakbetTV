import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Checkout.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { notify } from '../../utils/notifications';

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shippingDetails, setShippingDetails] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    cartItems, 
    getTotalPrice,
    getSelectedCount,
    createOrder,
    processPayment
  } = useCart();

  const selectedItems = cartItems.filter(item => item.selected);

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
    // Redirect to cart if no items are selected
    if (selectedItems.length === 0) {
      navigate('/cart');
      return;
    }

    // Pre-fill shipping details from user data if available
    if (user) {
      setShippingDetails(prev => ({
        ...prev,
        name: user.firstName + ' ' + user.lastName,
        email: user.email,
      }));
    }
  }, [user, navigate, selectedItems.length]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    // Validate all fields are filled
    for (const [key, value] of Object.entries(shippingDetails)) {
      if (!value.trim()) {
        setError(`Please fill in your ${key.replace('_', ' ')}`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    
    try {
      // Create the order
      const orderResult = await createOrder(user.id);
      
      // Process payment with DragonPay
      const paymentResult = await processPayment(
        orderResult.order_id, 
        user.email || 'customer@example.com'
      );
      
      window.location.href = paymentResult.payment_url;
    } catch (err) {
      handleError(err);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCart = () => {
    navigate('/cart');
  };

  const formatPrice = (price) => {
    if (isNaN(price)) return '₱--.--';
    return '₱' + parseFloat(price).toFixed(2);
  };

  const handleError = (err) => {
    notify.error(err.message || 'An error occurred during checkout. Please try again.');
  };

  if (selectedItems.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="checkout-page">
      <NavBar />
      <div className="checkout-container">
        <h2>Checkout</h2>
        
        {/* Shipping Details Section */}
        <div className="checkout-section">
          <h3>Shipping Details</h3>
          <div className="shipping-details">
            <div className="info-group">
              <label>Recipient</label>
              <div className="info-value">{shippingDetails.name || user?.firstName + ' ' + user?.lastName}</div>
            </div>
            
            <div className="info-group">
              <label>Contact Number</label>
              <div className="info-value">{shippingDetails.phone || 'Not provided'}</div>
            </div>
            
            <div className="info-group">
              <label>Delivery Address</label>
              <div className="info-value address-text">
                {shippingDetails.address || 'No address provided'}
                {shippingDetails.city && `, ${shippingDetails.city}`}
                {shippingDetails.state && `, ${shippingDetails.state}`}
                {shippingDetails.postal_code && ` ${shippingDetails.postal_code}`}
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Section */}
        <div className="checkout-section">
          <h3>Order Summary</h3>
          <div className="checkout-items">
            {selectedItems.map((item, index) => (
              <div key={index} className="checkout-item">
                <img 
                  src={getFullImageUrl(item.image_url)} 
                  alt={item.name}
                  className="item-image"
                  onError={(e) => e.target.src = '/placeholder-product.jpg'}
                />
                <div className="item-details">
                  <div className="item-name">{item.name}</div>
                  {item.variant_attributes && (
                    <div className="item-variant">
                      {Object.entries(item.variant_attributes)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')}
                    </div>
                  )}
                  <div className="item-quantity">Quantity: {item.quantity}</div>
                  <div className="item-price">{formatPrice(item.price * item.quantity)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="checkout-section">
          <h3>Payment Method</h3>
          <div className="payment-method">
            <input 
              type="radio" 
              id="dragonpay" 
              name="payment-method" 
              checked={true}
              readOnly 
            />
            <label htmlFor="dragonpay">
              <span className="payment-label">DragonPay</span>
              <span className="payment-description">Pay securely via DragonPay's payment channels</span>
            </label>
          </div>
        </div>

        {/* Order Total Section */}
        <div className="checkout-section">
          <div className="order-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(getTotalPrice())}</span>
            </div>
            <div className="summary-row">
              <span>Shipping Fee</span>
              <span>₱0.00</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(getTotalPrice())}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="checkout-actions">
          <button 
            className="back-to-cart-button" 
            onClick={handleBackToCart}
            disabled={loading}
          >
            Back to Cart
          </button>
          <button 
            className="place-order-button" 
            onClick={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout; 