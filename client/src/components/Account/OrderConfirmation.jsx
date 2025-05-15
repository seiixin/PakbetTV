import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './OrderConfirmation.css';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { notify } from '../../utils/notifications';

function OrderConfirmation() {
  const { orderId } = useParams();
  const { isAuthenticated, refreshing } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/orders/${orderId}`);
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
      'pending_payment': 'var(--secondary-color)', // Using theme gold color
      'processing': 'var(--primary-color)', // Using theme primary color
      'for_packing': 'var(--primary-color)',
      'packed': 'var(--primary-color)',
      'for_shipping': 'var(--primary-color)',
      'shipped': 'var(--primary-color)',
      'picked_up': 'var(--primary-color)',
      'delivered': '#228B22',
      'completed': '#228B22',
      'returned': 'var(--primary-color)',
      'cancelled': 'var(--primary-color)'
    };
    return statusColors[status.toLowerCase()] || '#757575';
  };

  const getStatusBgColor = (status) => {
    const statusBgColors = {
      'pending_payment': 'rgba(254, 193, 110, 0.15)', // Using theme secondary color with transparency
      'processing': 'rgba(162, 32, 26, 0.1)', // Using theme primary color with transparency
      'for_packing': 'rgba(162, 32, 26, 0.1)',
      'packed': 'rgba(162, 32, 26, 0.1)',
      'for_shipping': 'rgba(162, 32, 26, 0.1)',
      'shipped': 'rgba(162, 32, 26, 0.1)',
      'picked_up': 'rgba(162, 32, 26, 0.1)',
      'delivered': 'rgba(34, 139, 34, 0.1)',
      'completed': 'rgba(34, 139, 34, 0.1)',
      'returned': 'rgba(162, 32, 26, 0.1)',
      'cancelled': 'rgba(162, 32, 26, 0.1)'
    };
    return statusBgColors[status.toLowerCase()] || 'rgba(117, 117, 117, 0.1)';
  };

  // Helper function to determine step status
  const getStepStatus = (currentStatus, stepName) => {
    const orderSteps = {
      'pending_payment': 0,
      'processing': 1,
      'for_packing': 2,
      'packed': 2,
      'for_shipping': 3,
      'shipped': 3,
      'picked_up': 3,
      'delivered': 4,
      'completed': 5
    };
    
    const stepOrder = {
      'processing': 1,
      'packing': 2,
      'shipping': 3,
      'delivery': 4,
      'completed': 5
    };
    
    const currentStepValue = orderSteps[currentStatus?.toLowerCase()] || 0;
    const thisStepValue = stepOrder[stepName];
    
    if (currentStepValue > thisStepValue) {
      return 'completed';
    } else if (currentStepValue === thisStepValue) {
      return 'active';
    } else {
      return '';
    }
  };

  // Subtle loading spinner for auth refreshing
  const refreshSpinnerStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(128, 0, 0, 0.1)',
    borderTop: '2px solid #800000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    zIndex: 9999
  };

  const handleError = (err) => {
    notify.error(err.message || 'An error occurred while loading the order. Please try again.');
    return (
      <div className="account-container">
        <NavBar />
        <div className="account-wrapper">
          <Link to="/account/purchases" className="back-button">
            Back to Orders
          </Link>
        </div>
        <Footer />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="account-container">
        <NavBar />
        <div className="account-wrapper">
          <div className="loading">
            <p>Loading order details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return handleError(error);
  }

  if (!order) {
    return handleError('Order not found.');
  }

  return (
    <div className="order-confirmation-page">
      {refreshing && (
        <>
          <div style={refreshSpinnerStyle}></div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </>
      )}
      <NavBar />
      <div className="order-confirmation-wrapper">
        <h1 className="account-title">Order Details</h1>
        
        <div className="order-confirmation-container">
          <div className="order-header">
            <div className="order-info">
              <div className="order-number">
                <span>Order Code:</span> {order.order_code || order.order_id}
              </div>
              <div className="order-date">
                <span>Order Date:</span> {formatDate(order.created_at)}
              </div>
              {order.tracking_number && (
                <div className="tracking-number-display">
                  <span className="tracking-label">Tracking Number:</span>
                  <span className="tracking-value">{order.tracking_number}</span>
                  <button 
                    className="copy-tracking-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(order.tracking_number);
                      alert('Tracking number copied to clipboard!');
                    }}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              )}
            </div>
            <div 
              className="order-status"
              style={{ 
                color: getStatusColor(order.order_status),
                backgroundColor: getStatusBgColor(order.order_status),
                borderColor: getStatusColor(order.order_status),
                width: '120px', // Fixed width for uniform appearance
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace(/_/g, ' ')}
            </div>
          </div>

          {/* Order Progress Tracker */}
          <div className="order-progress-tracker">
            <div className="progress-line">
              <div 
                className="progress-line-filled" 
                style={{ 
                  width: (() => {
                    const statusMap = {
                      'pending_payment': '0%',
                      'processing': '20%',
                      'for_packing': '40%',
                      'packed': '40%',
                      'for_shipping': '60%',
                      'shipped': '60%',
                      'picked_up': '60%',
                      'delivered': '80%',
                      'completed': '100%'
                    };
                    return statusMap[order.order_status.toLowerCase()] || '0%';
                  })()
                }}
              />
            </div>
            
            {/* Processing Step */}
            <div className={`progress-step ${getStepStatus(order.order_status, 'processing')}`}>
              <div className="step-icon">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="step-label">Processing</div>
            </div>
            
            {/* Packing Step */}
            <div className={`progress-step ${getStepStatus(order.order_status, 'packing')}`}>
              <div className="step-icon">
                <i className="fas fa-box"></i>
              </div>
              <div className="step-label">Packing</div>
            </div>
            
            {/* Shipping Step */}
            <div className={`progress-step ${getStepStatus(order.order_status, 'shipping')}`}>
              <div className="step-icon">
                <i className="fas fa-truck"></i>
              </div>
              <div className="step-label">Shipping</div>
            </div>
            
            {/* Delivery Step */}
            <div className={`progress-step ${getStepStatus(order.order_status, 'delivery')}`}>
              <div className="step-icon">
                <i className="fas fa-home"></i>
              </div>
              <div className="step-label">Delivery</div>
            </div>
            
            {/* Completed Step */}
            <div className={`progress-step ${getStepStatus(order.order_status, 'completed')}`}>
              <div className="step-icon">
                <i className="fas fa-check"></i>
              </div>
              <div className="step-label">Completed</div>
            </div>
          </div>

          <div className="order-details">
            <div className="customer-info">
              <h3>Order Information</h3>
              <div className="info-grid">
                <div className="shipping-info">
                  <h4>Shipping Details</h4>
                  <div className="info-content">
                    <p><strong>Name:</strong> {order.shipping?.name || order.first_name && order.last_name ? `${order.first_name} ${order.last_name}` : order.name || 'Not provided'}</p>
                    <p><strong>Phone:</strong> {order.shipping?.phone || order.phone || 'Not provided'}</p>
                    <p><strong>Email:</strong> {order.shipping?.email || order.email || 'Not provided'}</p>
                    <div className="address-details">
                      <p><strong>Delivery Address:</strong></p>
                      {order.shipping?.full_address ? (
                        <>
                          <p className="address-line">{order.shipping.full_address.address_line1}</p>
                          {order.shipping.full_address.address_line2 && (
                            <p className="address-line">{order.shipping.full_address.address_line2}</p>
                          )}
                          {order.shipping.full_address.area && (
                            <p className="address-line">{order.shipping.full_address.area}</p>
                          )}
                          <p className="address-line">
                            {order.shipping.full_address.city}
                            {order.shipping.full_address.state && `, ${order.shipping.full_address.state}`}
                          </p>
                          <p className="address-line">{order.shipping.full_address.postal_code}</p>
                          <p className="address-line">{order.shipping.full_address.country === 'PH' ? 'Philippines' : 
                                                      order.shipping.full_address.country === 'MY' ? 'Malaysia' : 
                                                      order.shipping.full_address.country === 'SG' ? 'Singapore' : 
                                                      order.shipping.full_address.country}
                          </p>
                        </>
                      ) : order.shipping?.address_details ? (
                        <>
                          <p className="address-line">{order.shipping.address_details.address1}</p>
                          {order.shipping.address_details.address2 && (
                            <p className="address-line">{order.shipping.address_details.address2}</p>
                          )}
                          <p className="address-line">
                            {order.shipping.address_details.city}
                            {order.shipping.address_details.state && `, ${order.shipping.address_details.state}`}
                          </p>
                          <p className="address-line">{order.shipping.address_details.postcode}</p>
                          <p className="address-line">{order.shipping.address_details.country}</p>
                        </>
                      ) : order.shipping?.address ? (
                        <p className="address-line">{order.shipping.address}</p>
                      ) : (
                        <p className="address-line">{order.address || 'Address not provided'}</p>
                      )}
                    </div>
                    {order.shipping?.shipping_method && <p><strong>Shipping Method:</strong> {order.shipping.shipping_method}</p>}
                    {order.shipping?.estimated_delivery && <p><strong>Estimated Delivery:</strong> {order.shipping.estimated_delivery}</p>}
                  </div>
                </div>

                <div className="payment-info">
                  <h4>Payment Details</h4>
                  <div className="info-content">
                    {order.payment && (
                      <>
                        <p><strong>Method:</strong> {order.payment.payment_method}</p>
                        <p><strong>Transaction ID:</strong> {order.payment.transaction_id || 'Pending'}</p>
                      </>
                    )}
                    {order.tracking_number && (
                      <p>
                        <strong>Tracking Number:</strong>
                        <span className="tracking-value-inline">{order.tracking_number}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-items">
              <h3>Order Items</h3>
              <div className="items-list">
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="order-item">
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
              
              <div className="order-summary-inline">
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