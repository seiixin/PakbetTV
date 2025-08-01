import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AddressForm from '../components/Checkout/AddressForm';
import { useAuth } from '../context/AuthContext';
import { useCartData } from '../hooks/useCart'; // Changed from CartContext to useCart hook
import { getCart } from '../utils/cookies';
import { getFullImageUrl } from '../utils/imageUtils';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import './Checkout.css';
import API_BASE_URL from '../config';

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Use the cart hook - let it handle its own data loading
  const { cartItems, loading: cartLoading } = useCartData();
  
  // Debug: Log cart items when they change
  useEffect(() => {
    console.log('[Checkout] Cart items received:', cartItems.map(item => ({
      name: item.name,
      price: item.price,
      discount_percentage: item.discount_percentage, 
      discounted_price: item.discounted_price,
      quantity: item.quantity
    })));
    console.log('[Checkout] Current subtotal will be:', calculateSubtotal());
  }, [cartItems, calculateSubtotal]);
  
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  
  // Address state
  const [address, setAddress] = useState({
    address1: '',
    address2: '',
    area: '',
    city: '',
    state: '',
    postcode: '',
    country: 'PH', // Default to Philippines
    address_type: 'home'
  });
  const [addressValid, setAddressValid] = useState(false);
  
  // Shipping details state
  const [shippingDetails, setShippingDetails] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
  });
  
  // Pre-fill user information when component mounts or user changes
  useEffect(() => {
    if (user) {
      console.log('User data for checkout:', user);
      setShippingDetails(prev => ({
        ...prev,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        postal_code: user.postal_code || ''
      }));
      
      // Also set the AddressForm initial values if user has address info
      if (user.address) {
        setAddress({
          address1: user.address || '',
          address2: '',
          area: '',
          city: user.city || '',
          state: user.state || '',
          postcode: user.postal_code || '',
          country: user.country || 'PH', // Default to Philippines
          address_type: 'home'
        });
        
        // Set address validity after a short delay to allow the form to initialize
        setTimeout(() => {
          setAddressValid(true);
        }, 100);
      }
    }
  }, [user]);
  
  // Get cart items on component mount and handle user authentication
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    
    // Set loading to false since we're using the cart hook now
    setLoading(false);
  }, [user, navigate]);
  
  const handleAddressChange = (addressData, isValid) => {
    setAddress(addressData);
    setAddressValid(isValid);
  };
  
  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };
  
  // Calculate subtotal - use the exact same logic as the order summary display
  const calculateSubtotal = React.useCallback(() => {
    console.log('[Checkout] calculateSubtotal - using order summary logic');
    
    const subtotal = cartItems.reduce((total, item) => {
      // Use the EXACT same logic as the order summary display
      const itemTotal = (
        (item.discount_percentage && item.discounted_price > 0) 
          ? parseFloat(item.discounted_price) 
          : parseFloat(item.price)
      ) * item.quantity;
      
      console.log(`[Checkout] Item: ${item.name}, Price: ${item.price}, Discounted: ${item.discounted_price}, Quantity: ${item.quantity}, Item Total: ${itemTotal}`);
      return total + itemTotal;
    }, 0);
    
    console.log(`[Checkout] Final subtotal: ${subtotal.toFixed(2)}`);
    return subtotal.toFixed(2);
  }, [cartItems]);
  
  const handleShippingDetailsChange = (e) => {
    const { name, value } = e.target;
    setShippingDetails(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Sync with address form for relevant fields
    if (name === 'address') {
      setAddress(prev => ({ ...prev, address1: value }));
    } else if (name === 'city') {
      setAddress(prev => ({ ...prev, city: value }));
    } else if (name === 'state') {
      setAddress(prev => ({ ...prev, state: value }));
    } else if (name === 'postal_code') {
      setAddress(prev => ({ ...prev, postcode: value }));
    }
  };
  
  // Validate shipping details with strict rules
  const validateShippingDetails = () => {
    const required = ['name', 'phone', 'email', 'address', 'city', 'state', 'postal_code'];
    const missing = required.filter(field => !shippingDetails[field]);
    if (missing.length > 0) {
      setError(`Please fill in all required fields: ${missing.join(', ')}`);
      return false;
    }
    // Name: max 50 chars
    if (shippingDetails.name.length > 50) {
      setError('Name must not exceed 50 characters');
      return false;
    }
    // Phone: min 5 chars, max 15 chars
    const phone = shippingDetails.phone.replace(/[\s-]/g, '');
    if (phone.length < 5 || phone.length > 15) {
      setError('Phone number must be between 5 and 15 characters');
      return false;
    }
    // Validate Philippine phone format
    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid Philippine phone number (e.g., +639123456789 or 09123456789)');
      return false;
    }
    // Address: max 125 chars
    if (shippingDetails.address.length > 125) {
      setError('Address must not exceed 125 characters');
      return false;
    }
    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingDetails.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const isFormValid = () => {
    if (!shippingDetails.name || shippingDetails.name.length > 50) return false;
    if (!shippingDetails.address || shippingDetails.address.length > 125) return false;
    const phone = shippingDetails.phone ? shippingDetails.phone.replace(/[\s-]/g, '') : '';
    if (!phone || phone.length < 5 || phone.length > 15) return false;
    if (!/^(\+63|0)[0-9]{10}$/.test(phone)) return false;
    if (!shippingDetails.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingDetails.email)) return false;
    if (!addressValid) return false;
    return true;
  };

  const handlePlaceOrder = async () => {
    // Strict validation before placing order
    if (!validateShippingDetails()) {
      return;
    }
    if (!addressValid) {
      setError('Please fill in all required address fields correctly');
      return;
    }
    try {
      setProcessingOrder(true);
      setError(null);
      // Combine shipping details with address form data
      const combinedAddress = {
        address_line1: address.address1,
        address_line2: address.address2 || '',
        area: address.area || '',
        city: address.city,
        state: address.state,
        postal_code: address.postcode,
        country: address.country,
        address_type: address.address_type
      };
      const orderData = {
        shipping_details: {
          ...shippingDetails,
          full_address: combinedAddress
        },
        items: cartItems,
        payment_method: paymentMethod
      };
      console.log('Placing order with data:', orderData);
      const response = await axios.post('/api/orders', orderData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      setSuccess('Order placed successfully!');
      setTimeout(() => {
        navigate('/account/purchases');
      }, 2000);
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(err.response?.data?.message || 'Failed to place your order. Please try again.');
    } finally {
      setProcessingOrder(false);
    }
  };
  
  if (loading || cartLoading) {
    return (
      <div className="checkout-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }
  
  if (cartItems.length === 0) {
    return (
      <div className="checkout-container">
        <div className="empty-cart-message">
          <h2>Your cart is empty</h2>
          <p>Add some items to your cart before checking out.</p>
          <button 
            className="primary-button" 
            onClick={() => navigate('/shop')}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      
      <div className="checkout-grid">
        <div className="checkout-form">
          <div className="checkout-section">
            <h2>Shipping Details</h2>
            <div className="shipping-form">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={shippingDetails.name}
                  onChange={handleShippingDetailsChange}
                  required
                  placeholder="Enter your full name"
                  className={!shippingDetails.name ? 'error' : ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Contact Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={shippingDetails.phone}
                  onChange={handleShippingDetailsChange}
                  required
                  placeholder="Enter your contact number"
                  className={!shippingDetails.phone ? 'error' : ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={shippingDetails.email}
                  onChange={handleShippingDetailsChange}
                  required
                  placeholder="Enter your email address"
                  className={!shippingDetails.email ? 'error' : ''}
                />
              </div>

              <AddressForm 
                onChange={handleAddressChange}
                initialAddress={address}
              />
            </div>
          </div>
          
          <div className="checkout-section">
            <h2>Payment Method</h2>
            <div className="payment-methods">
              <div className="payment-option">
                <input
                  type="radio"
                  id="credit_card"
                  name="payment_method"
                  value="credit_card"
                  checked={paymentMethod === 'credit_card'}
                  onChange={handlePaymentMethodChange}
                />
                <label htmlFor="credit_card">Credit Card</label>
              </div>
              
              <div className="payment-option">
                <input
                  type="radio"
                  id="bank_transfer"
                  name="payment_method"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={handlePaymentMethodChange}
                />
                <label htmlFor="bank_transfer">Bank Transfer</label>
              </div>
              
              <div className="payment-option">
                <input
                  type="radio"
                  id="cod"
                  name="payment_method"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={handlePaymentMethodChange}
                />
                <label htmlFor="cod">Cash on Delivery</label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="order-summary">
          <h2>Order Summary</h2>
          
          <div className="summary-items">
            {cartItems.map(item => (
              <div key={item.id} className="summary-item">
                <img 
                  src={getFullImageUrl(item.image_url)} 
                  alt={item.name}
                  className="item-image"
                  onError={(e) => {
                    console.error('Image load error:', e.target.src);
                    e.target.onerror = null; // Prevent infinite loop
                    e.target.src = '/placeholder-product.jpg'; 
                  }}
                />
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-variant">
                    {item.size && `Size: ${item.size}`} 
                    {item.color && ` Color: ${item.color}`}
                  </span>
                  <span className="item-quantity">Qty: {item.quantity}</span>
                </div>
                <div className="item-price">
                  RM {((
                    (item.discount_percentage && item.discounted_price > 0) 
                      ? parseFloat(item.discounted_price) 
                      : parseFloat(item.price)
                  ) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="summary-total">
            <div className="subtotal">
              <span>Subtotal</span>
              <span>RM {calculateSubtotal()}</span>
            </div>
            <div className="shipping">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="total">
              <span>Total</span>
              <span>RM {calculateSubtotal()}</span>
            </div>
          </div>
          
          <button
            className="place-order-button"
            onClick={handlePlaceOrder}
            disabled={processingOrder || !addressValid || !isFormValid()}
          >
            {processingOrder ? 'Processing...' : 'Place Order'}
          </button>
          
          <button
            className="back-button"
            onClick={() => navigate('/cart')}
            disabled={processingOrder}
          >
            Back to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;