import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AddressForm from '../components/Checkout/AddressForm';
import { useAuth } from '../context/AuthContext';
import './Checkout.css';
import API_BASE_URL from '../config';

const getFullImageUrl = (url) => {
  if (!url) {
    return '/placeholder-product.jpg';
  }
  
  // Handle case where url is an object (longblob from database)
  if (typeof url === 'object') {
    if (url.data) {
      // Handle Buffer or Uint8Array data
      if (url.data instanceof Uint8Array || Buffer.isBuffer(url.data)) {
        return `data:${url.type || 'image/jpeg'};base64,${Buffer.from(url.data).toString('base64')}`;
      }
      // Handle base64 string data
      if (typeof url.data === 'string') {
        return `data:${url.type || 'image/jpeg'};base64,${url.data}`;
      }
    }
    // If the object itself is a Buffer or Uint8Array
    if (url instanceof Uint8Array || Buffer.isBuffer(url)) {
      return `data:image/jpeg;base64,${Buffer.from(url).toString('base64')}`;
    }
    return '/placeholder-product.jpg';
  }
  
  // Handle string URLs
  if (typeof url === 'string') {
    // Handle base64 encoded images
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
  }
  
  return '/placeholder-product.jpg';
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
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
    country: 'MY',
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
  
  // Get cart items on component mount and handle persistence
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    
    // First try to get cart from localStorage to persist across refreshes
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          setCartItems(parsedCart);
          setSelectedItems(parsedCart.map(item => item.id));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to parse saved cart:', err);
      }
    }
    
    // If we have items from previous page, use those
    if (location.state && location.state.items) {
      const items = location.state.items;
      setCartItems(items);
      setSelectedItems(items.map(item => item.id));
      // Save to localStorage for persistence
      localStorage.setItem('cartItems', JSON.stringify(items));
      setLoading(false);
    } else {
      fetchCartItems();
    }
  }, [user, navigate, location]);
  
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/cart', {
        headers: {
          'x-auth-token': token
        }
      });
      
      // Check if response.data is an array, if not, look for items property
      const items = Array.isArray(response.data) ? response.data : response.data.items;
      
      // Validate that we have an array of items
      if (!Array.isArray(items)) {
        throw new Error('Invalid response format from server');
      }
      
      setCartItems(items);
      // Select all items by default
      setSelectedItems(items.map(item => item.id));
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch cart items:', err);
      setError('Failed to load cart items. Please try again.');
      setLoading(false);
    }
  };
  
  const handleAddressChange = (addressData, isValid) => {
    setAddress(addressData);
    setAddressValid(isValid);
  };
  
  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };
  
  const calculateSubtotal = () => {
    return cartItems
      .reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0)
      .toFixed(2);
  };
  
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
  
  // Validate shipping details
  const validateShippingDetails = () => {
    const required = ['name', 'phone', 'email', 'address', 'city', 'state', 'postal_code'];
    const missing = required.filter(field => !shippingDetails[field]);
    
    if (missing.length > 0) {
      setError(`Please fill in all required fields: ${missing.join(', ')}`);
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingDetails.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Validate phone number (basic validation)
    const phoneRegex = /^[0-9+\-\s()]{8,}$/;
    if (!phoneRegex.test(shippingDetails.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    return true;
  };
  
  const handlePlaceOrder = async () => {
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
        navigate(`/orders/${response.data.order.order_id}`);
      }, 2000);
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(err.response?.data?.message || 'Failed to place your order. Please try again.');
    } finally {
      setProcessingOrder(false);
    }
  };
  
  if (loading) {
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
                  RM {(parseFloat(item.price) * item.quantity).toFixed(2)}
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
            disabled={processingOrder || !addressValid}
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