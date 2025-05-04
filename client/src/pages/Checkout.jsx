import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AddressForm from '../components/Checkout/AddressForm';
import { useAuth } from '../context/AuthContext';
import './Checkout.css';

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
  
  // Get cart items on component mount
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    
    // If we have items from previous page, use those
    if (location.state && location.state.items) {
      setCartItems(location.state.items);
      setSelectedItems(location.state.items.map(item => item.id));
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
      setCartItems(response.data);
      // Select all items by default
      setSelectedItems(response.data.map(item => item.id));
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
  
  const handlePlaceOrder = async () => {
    if (!addressValid) {
      setError('Please fill in all required address fields.');
      return;
    }
    
    try {
      setProcessingOrder(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/orders', 
        {
          address: address, // Send the structured address object
          payment_method: paymentMethod
        },
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setSuccess('Order placed successfully!');
      // Redirect to order confirmation page
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
            <h2>Shipping Address</h2>
            <AddressForm 
              onChange={handleAddressChange}
              initialAddress={address}
            />
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