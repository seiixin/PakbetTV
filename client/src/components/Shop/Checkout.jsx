import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Checkout.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';

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

  useEffect(() => {
    // Redirect to cart if no items are selected
    if (selectedItems.length === 0) {
      navigate('/cart');
      return;
    }

    // Load user's shipping details if logged in
    if (user) {
      const fetchUserDetails = async () => {
        try {
          console.log('Attempting to fetch shipping details...');
          const token = localStorage.getItem('token');
          
          if (!token) {
            console.error('No auth token found');
            navigate('/login', { state: { from: '/checkout' } });
            return;
          }
          
          // Fetch shipping addresses
          const response = await fetch(`${API_BASE_URL}/api/users/shipping-addresses`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Shipping addresses API response status:', response.status);
          
          if (response.status === 401) {
            console.error('Unauthorized - redirecting to login');
            navigate('/login', { state: { from: '/checkout' } });
            return;
          }
          
          if (response.ok) {
            const addresses = await response.json();
            console.log('Shipping addresses data:', addresses);
            
            // Get default or first address
            const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
            
            if (defaultAddress) {
              // Set shipping details from default address
              setShippingDetails({
                name: user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : '',
                address1: defaultAddress.address1 || '',
                address2: defaultAddress.address2 || '',
                city_municipality: defaultAddress.city_municipality || '',
                province: defaultAddress.province || '',
                region: defaultAddress.region || '',
                postcode: defaultAddress.postcode || '',
                phone: defaultAddress.phone || user.phone || '',
                barangay: defaultAddress.barangay || '',
                street_name: defaultAddress.street_name || '',
                building: defaultAddress.building || '',
                house_number: defaultAddress.house_number || ''
              });
            } else {
              // No addresses found, try to pre-fill with user data
              setShippingDetails({
                name: user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : '',
                address1: '',
                address2: '',
                city_municipality: '',
                province: '',
                region: '',
                postcode: '',
                phone: user.phone || '',
                barangay: '',
                street_name: '',
                building: '',
                house_number: ''
              });
            }
          } else {
            console.error('Error fetching addresses. Status:', response.status);
            try {
              const errorData = await response.json();
              console.error('Error details:', errorData);
              if (errorData.message) {
                setError(errorData.message);
              }
            } catch (e) {
              console.error('Could not parse error response as JSON');
              setError('Failed to load shipping details');
            }
            // Continue with empty shipping details
            setShippingDetails({
              name: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : '',
              address1: '',
              address2: '',
              city_municipality: '',
              province: '',
              region: '',
              postcode: '',
              phone: user.phone || '',
              barangay: '',
              street_name: '',
              building: '',
              house_number: ''
            });
          }
        } catch (err) {
          console.error('Error fetching shipping details:', err);
          setError('Network error while loading shipping details');
          // Continue with empty shipping details on error
          setShippingDetails({
            name: user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : '',
            address1: '',
            address2: '',
            city_municipality: '',
            province: '',
            region: '',
            postcode: '',
            phone: user.phone || '',
            barangay: '',
            street_name: '',
            building: '',
            house_number: ''
          });
        }
      };
      
      fetchUserDetails();
    } else {
      // Redirect to login if not logged in
      navigate('/login', { state: { from: '/checkout' } });
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
      console.log('Updating shipping details...');
      // First, update user shipping details
      const updateResponse = await fetch(`${API_BASE_URL}/api/users/update-shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(shippingDetails)
      });
      
      if (!updateResponse.ok) {
        console.error('Failed to update shipping details:', updateResponse.status);
        // Continue anyway - the order is more important
      } else {
        console.log('Shipping details updated successfully');
      }
      
      console.log('Creating order...');
      // Create the order
      const orderResult = await createOrder(user.id);
      console.log('Order created:', orderResult);
      
      console.log('Processing payment...');
      // Process payment with Dragonpay
      const paymentResult = await processPayment(
        orderResult.order_id, 
        user.email || 'customer@example.com'
      );
      
      console.log('Redirecting to payment URL:', paymentResult.payment_url);
      window.location.href = paymentResult.payment_url;
    } catch (err) {
      setError(err.message || 'Failed to process order. Please try again.');
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

  const calculateDiscountedPrice = (item) => {
    if (item.discount_percentage) { 
      return parseFloat(item.price) * (1 - (item.discount_percentage / 100));
    }
    return parseFloat(item.price);
  };
  
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

  if (selectedItems.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="checkout-page">
      <NavBar />
      <div className="checkout-container">
        <h2>Checkout</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="checkout-grid">
          {/* Left Column: Shipping Details */}
          <div className="checkout-shipping">
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
                <label>Complete Address</label>
                <div className="info-value address-text">
                  {[
                    shippingDetails.house_number && `${shippingDetails.house_number}`,
                    shippingDetails.building && `${shippingDetails.building}`,
                    shippingDetails.street_name && `${shippingDetails.street_name}`,
                    shippingDetails.barangay && `Brgy. ${shippingDetails.barangay}`,
                    shippingDetails.city_municipality && `${shippingDetails.city_municipality}`,
                    shippingDetails.province && `${shippingDetails.province}`,
                    shippingDetails.region && `${shippingDetails.region}`,
                    shippingDetails.postcode && `${shippingDetails.postcode}`
                  ].filter(Boolean).join(', ')}
                </div>
              </div>

              <div className="shipping-actions">
                <Link 
                  to="/account" 
                  className="edit-shipping-link"
                  state={{ returnTo: '/checkout' }}
                >
                  Edit Shipping Details
                </Link>
              </div>
            </div>
          </div>
          
          {/* Right Column: Order Summary */}
          <div className="checkout-summary">
            <h3>Order Summary</h3>
            
            <div className="checkout-items">
              {selectedItems.map(item => {
                const itemTotalPrice = calculateDiscountedPrice(item) * item.quantity;
                return (
                  <div key={item.variant_id || item.id} className="checkout-item">
                    <img 
                      src={getFullImageUrl(item.image_url)} 
                      alt={item.name} 
                      className="checkout-item-image"
                      onError={(e) => e.target.src = '/placeholder-product.jpg'}
                    />
                    <div className="checkout-item-details">
                      <h4 className="checkout-item-name">{item.name}</h4>
                      {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                        <div className="checkout-item-variant">
                          {Object.entries(item.variant_attributes)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </div>
                      )}
                      <div className="checkout-item-price-qty">
                        <span>{formatPrice(calculateDiscountedPrice(item))}</span>
                        <span>×</span>
                        <span>{item.quantity}</span>
                      </div>
                      <div className="checkout-item-total">
                        {formatPrice(itemTotalPrice)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="checkout-payment">
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
                  <div className="payment-logo">DragonPay</div>
                  <div className="payment-description">
                    Pay securely via DragonPay's payment channels
                  </div>
                </label>
              </div>
            </div>
            
            <div className="checkout-totals">
              <div className="checkout-total-row">
                <span>Subtotal</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="checkout-total-row">
                <span>Shipping</span>
                <span>₱0.00</span>
              </div>
              <div className="checkout-total-row checkout-grand-total">
                <span>Total</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
            </div>
            
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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout; 