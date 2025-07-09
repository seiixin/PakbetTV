import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './Checkout.css';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { notify } from '../../utils/notifications';
import { authService } from '../../services/api';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, getTotalPrice, createOrder, processPayment } = useCart();
  const selectedItems = cartItems.filter(item => item.selected);

  const [shippingDetails, setShippingDetails] = useState({
    name: '',
    phone: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Fetch user profile once
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const res = await authService.getProfile();
        const profile = res.data;
        setShippingDetails({
          name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          phone: '', // intentionally blank, user must enter
          address: profile.address || '',
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setShippingDetails(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
    if (!shippingDetails.name || !shippingDetails.phone || !shippingDetails.address) {
      notify.error('Please complete all shipping details.');
      return;
    }
    if (!termsAccepted) {
      notify.error('Please accept the terms.');
      return;
    }

    try {
      setLoading(true);
      const order = await createOrder(user.id, 0); // shipping fee hardcoded as 0 here
      const payment = await processPayment(order.order_id, user.email);
      if (payment.payment_url) {
        window.location.href = payment.payment_url;
      } else {
        notify.error('Payment failed.');
      }
    } catch (err) {
      console.error(err);
      notify.error('Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <NavBar />
      <div className="checkout-container">
        <h2>Checkout</h2>

        <div className="checkout-section">
          <h3>Shipping Details</h3>
          <div className="shipping-form">
            <input
              type="text"
              name="name"
              value={shippingDetails.name}
              placeholder="Recipient Name"
              onChange={handleChange}
            />
            <input
              type="text"
              name="phone"
              value={shippingDetails.phone}
              placeholder="Mobile Number"
              onChange={handleChange}
            />
            <textarea
              name="address"
              value={shippingDetails.address}
              placeholder="Full Address"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="checkout-section">
          <h3>Order Summary</h3>
          {selectedItems.map(item => (
            <div key={item.id} className="checkout-item">
              <span>{item.name}</span>
              <span>Qty: {item.quantity}</span>
              <span>₱{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="summary-row total">
            <span>Total:</span>
            <span>₱{getTotalPrice().toFixed(2)}</span>
          </div>
        </div>

        <div className="terms">
          <label>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            I accept the Terms and Conditions
          </label>
        </div>

        <div className="checkout-actions">
          <button onClick={() => navigate('/cart')}>Back to Cart</button>
          <button onClick={handlePlaceOrder} disabled={loading}>
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
