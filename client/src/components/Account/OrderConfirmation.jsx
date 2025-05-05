import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Account.css';
import NavBar from '../NavBar';
import Footer from '../Footer';

function OrderConfirmation() {
  const { orderId } = useParams();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${orderId}`);
        setOrder(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details. Please try again later.');
        setLoading(false);
      }
    };

    if (isAuthenticated && orderId) {
      fetchOrderDetails();
    }
  }, [isAuthenticated, orderId]);

  const formatDate = (dateString) => {
    const options = { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'pending_payment': '#FFD700', // Gold
      'processing': '#800000', // Maroon
      'for_packing': '#A52A2A', // Darker maroon
      'packed': '#B8860B', // Dark goldenrod
      'for_shipping': '#800000', // Maroon
      'shipped': '#8B0000', // Dark red
      'picked_up': '#DAA520', // Goldenrod
      'delivered': '#006400', // Dark green
      'completed': '#228B22', // Forest green
      'returned': '#8B0000', // Dark red
      'cancelled': '#8B0000' // Dark red
    };
    return statusColors[status.toLowerCase()] || '#757575';
  };

  const getStatusBgColor = (status) => {
    const statusBgColors = {
      'pending_payment': 'rgba(255, 215, 0, 0.15)', // Gold with transparency
      'processing': 'rgba(128, 0, 0, 0.1)', // Maroon with transparency
      'for_packing': 'rgba(165, 42, 42, 0.1)', // Darker maroon with transparency
      'packed': 'rgba(184, 134, 11, 0.1)', // Dark goldenrod with transparency
      'for_shipping': 'rgba(128, 0, 0, 0.1)', // Maroon with transparency
      'shipped': 'rgba(139, 0, 0, 0.1)', // Dark red with transparency
      'picked_up': 'rgba(218, 165, 32, 0.1)', // Goldenrod with transparency
      'delivered': 'rgba(0, 100, 0, 0.1)', // Dark green with transparency
      'completed': 'rgba(34, 139, 34, 0.1)', // Forest green with transparency
      'returned': 'rgba(139, 0, 0, 0.1)', // Dark red with transparency
      'cancelled': 'rgba(139, 0, 0, 0.1)' // Dark red with transparency
    };
    return statusBgColors[status.toLowerCase()] || 'rgba(117, 117, 117, 0.1)';
  };

  if (loading) {
    return (
      <div className="account-container">
        <NavBar />
        <div className="account-wrapper">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading order details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="account-container">
        <NavBar />
        <div className="account-wrapper">
          <div className="error-message">{error}</div>
          <Link to="/account/purchases" className="back-button">
            Back to Purchases
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="account-container">
        <NavBar />
        <div className="account-wrapper">
          <div className="error-message">Order not found.</div>
          <Link to="/account/purchases" className="back-button">
            Back to Purchases
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="account-container">
      <NavBar />
      <div className="account-wrapper">
        <h1 className="account-title">Order Details</h1>
        
        <div className="order-confirmation-container">
          <div className="order-header">
            <div className="order-info">
              <div className="order-number">
                <span>Order ID:</span> {order.order_id}
              </div>
              <div className="order-date">
                <span>Order Date:</span> {formatDate(order.created_at)}
              </div>
            </div>
            <div 
              className="order-status"
              style={{ 
                color: getStatusColor(order.order_status),
                backgroundColor: getStatusBgColor(order.order_status),
                borderColor: getStatusColor(order.order_status)
              }}
            >
              {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace(/_/g, ' ')}
            </div>
          </div>

          <div className="order-details">
            <div className="shipping-info">
              <h3>Shipping Information</h3>
              <div className="info-content">
                <p><strong>Name:</strong> {order.first_name} {order.last_name}</p>
                {order.shipping && (
                  <>
                    <p><strong>Address:</strong> {order.shipping.address}</p>
                    <p><strong>City:</strong> {order.shipping.city}</p>
                    <p><strong>State/Province:</strong> {order.shipping.state}</p>
                    <p><strong>Postal Code:</strong> {order.shipping.postal_code}</p>
                  </>
                )}
                <p><strong>Phone:</strong> {order.phone || 'Not provided'}</p>
                <p><strong>Email:</strong> {order.email}</p>
              </div>
            </div>

            <div className="payment-info">
              <h3>Payment Information</h3>
              <div className="info-content">
                {order.payment && (
                  <>
                    <p>
                      <strong>Status:</strong> 
                      <span className={`payment-status ${order.payment.status.toLowerCase()}`}>
                        {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                      </span>
                    </p>
                    <p><strong>Method:</strong> {order.payment.payment_method}</p>
                    <p><strong>Transaction ID:</strong> {order.payment.transaction_id || 'Pending'}</p>
                  </>
                )}
              </div>
            </div>

            <div className="order-items">
              <h3>Order Items</h3>
              <div className="items-list">
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-image">
                      <img 
                        src={item.image_url || '/placeholder-product.jpg'} 
                        alt={item.product_name}
                        onError={(e) => e.target.src = '/placeholder-product.jpg'}
                      />
                    </div>
                    <div className="item-details">
                      <h4>{item.product_name}</h4>
                      <p className="item-code">Product Code: {item.product_code}</p>
                      {item.variant_attributes && (
                        <p className="item-variants">
                          {Object.entries(item.variant_attributes)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </p>
                      )}
                      <div className="item-price-qty">
                        <span className="item-price">₱{parseFloat(item.price).toFixed(2)}</span>
                        <span className="item-quantity">× {item.quantity}</span>
                        <span className="item-total">
                          ₱{(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>₱{parseFloat(order.total_price).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>₱0.00</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>₱{parseFloat(order.total_price).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-actions">
            <Link to="/account/purchases" className="back-button">
              Back to Purchases
            </Link>
            {order.tracking_number && (
              <Link 
                to={`/account/tracking/${order.order_id}`}
                className="track-order-button"
              >
                Track Order
              </Link>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default OrderConfirmation; 