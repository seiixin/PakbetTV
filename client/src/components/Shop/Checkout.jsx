import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Checkout.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { notify } from '../../utils/notifications';
import { authService } from '../../services/api';

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [hasShippingAddress, setHasShippingAddress] = useState(false);
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

    // Fetch user profile data including shipping details
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setProfileLoading(true);
        const response = await authService.getProfile();
        const profileData = response.data;
        
        console.log('Profile data received:', profileData);
        
        // Format the address from shipping_details
        let formattedAddress = '';
        let hasAddress = false;
        let phoneNumber = '';
        
        // First try to get shipping addresses from the dedicated endpoint
        try {
          const shippingResponse = await authService.getShippingAddresses();
          console.log("Shipping addresses received:", shippingResponse.data);
          
          const addresses = shippingResponse.data;
          if (addresses && addresses.length > 0) {
            const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
            console.log("Using default address from shipping addresses:", defaultAddress);
            
            hasAddress = true;
            phoneNumber = defaultAddress.phone || profileData.phone || '';
            
            // Build address components from shipping addresses
            const addressParts = [];
            
            // Primary address (house number, building, street, barangay)
            const address1Parts = [];
            if (defaultAddress.house_number) address1Parts.push(defaultAddress.house_number);
            if (defaultAddress.building) address1Parts.push(defaultAddress.building);
            if (defaultAddress.street_name) address1Parts.push(defaultAddress.street_name);
            if (defaultAddress.barangay) address1Parts.push(defaultAddress.barangay);
            
            if (address1Parts.length > 0) {
              addressParts.push(address1Parts.join(', '));
            } else if (defaultAddress.address1) {
              addressParts.push(defaultAddress.address1);
            }
            
            // Secondary address parts
            if (defaultAddress.address2) addressParts.push(defaultAddress.address2);
            
            formattedAddress = addressParts.join(', ');
            
            // Set shipping details from the shipping address data
            setShippingDetails({
              name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
              phone: phoneNumber,
              email: profileData.email || '',
              address: formattedAddress,
              city: defaultAddress.city_municipality || defaultAddress.city || '',
              state: defaultAddress.province || defaultAddress.state || '',
              postal_code: defaultAddress.postcode || '',
            });
          }
        } catch (addressError) {
          console.error("Error fetching shipping addresses:", addressError);
          // Continue with profile data if shipping addresses fetch fails
        }
        
        // Fall back to profile shipping_details if no shipping addresses found
        if (!hasAddress && profileData.shipping_details) {
          const sd = profileData.shipping_details;
          hasAddress = true;
          phoneNumber = sd.phone || profileData.phone || '';
          
          // Build address components
          const addressParts = [];
          
          // Primary address (house number, building, street, barangay)
          const address1Parts = [];
          if (sd.house_number) address1Parts.push(sd.house_number);
          if (sd.building) address1Parts.push(sd.building);
          if (sd.street_name) address1Parts.push(sd.street_name);
          if (sd.barangay) address1Parts.push(sd.barangay);
          
          if (address1Parts.length > 0) {
            addressParts.push(address1Parts.join(', '));
          } else if (sd.address1) {
            addressParts.push(sd.address1);
          }
          
          // Secondary address parts
          if (sd.address2) addressParts.push(sd.address2);
          
          formattedAddress = addressParts.join(', ');
          
          // Only set shipping details if we haven't already set them from shipping addresses
          if (!shippingDetails.address) {
            setShippingDetails({
              name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
              phone: phoneNumber,
              email: profileData.email || '',
              address: formattedAddress,
              city: sd.city || '',
              state: sd.state || '',
              postal_code: sd.postal_code || '',
            });
          }
        } else if (!hasAddress && profileData.address) {
          // Fallback to user's main address field if available
          formattedAddress = profileData.address;
          hasAddress = !!formattedAddress;
          phoneNumber = profileData.phone || '';
          
          if (!shippingDetails.address) {
            setShippingDetails({
              name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
              phone: phoneNumber,
              email: profileData.email || '',
              address: formattedAddress,
              city: '',
              state: '',
              postal_code: '',
            });
          }
        }
        
        setHasShippingAddress(hasAddress);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, navigate, selectedItems.length]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    // Check if shipping address is available
    if (!hasShippingAddress) {
      notify.error('Please update your shipping address before placing an order');
      navigate('/account');
      return;
    }
    
    // Validate all required fields are filled
    const requiredFields = ['name', 'phone', 'email', 'address', 'city', 'state', 'postal_code'];
    const missingFields = requiredFields.filter(field => !shippingDetails[field]?.trim());
    
    if (missingFields.length > 0) {
      setError(`Please provide your ${missingFields.map(f => f.replace('_', ' ')).join(', ')}`);
      notify.error('Please complete all required shipping information');
      return;
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
  
  const handleUpdateAddress = () => {
    navigate('/account');
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

  // Format the complete address for display
  const getFormattedAddress = () => {
    if (!shippingDetails.address) {
      return profileLoading ? 'Loading...' : 'No address provided';
    }
    
    const parts = [shippingDetails.address];
    if (shippingDetails.city) parts.push(shippingDetails.city);
    if (shippingDetails.state) parts.push(shippingDetails.state);
    if (shippingDetails.postal_code) parts.push(shippingDetails.postal_code);
    
    return parts.join(', ');
  };

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
              <div className="info-value">{shippingDetails.name || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '')}</div>
            </div>
            
            <div className="info-group">
              <label>Contact Number</label>
              <div className="info-value">{shippingDetails.phone || (profileLoading ? 'Loading...' : 'Not provided')}</div>
            </div>
            
            <div className="info-group">
              <label>Delivery Address</label>
              <div className="info-value address-text">
                {getFormattedAddress()}
              </div>
              {!hasShippingAddress && !profileLoading && (
                <>
                  <div className="address-warning">
                    Please add a shipping address to continue with checkout
                  </div>
                  <button 
                    className="update-address-button primary" 
                    onClick={handleUpdateAddress}
                  >
                    Update Address
                  </button>
                </>
              )}
              {hasShippingAddress && (
                <button 
                  className="update-address-button" 
                  onClick={handleUpdateAddress}
                >
                  Change Address
                </button>
              )}
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
            disabled={loading || !hasShippingAddress}
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
        
        {!hasShippingAddress && !profileLoading && (
          <div className="address-warning">
            Please update your shipping address before placing an order.
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Checkout; 