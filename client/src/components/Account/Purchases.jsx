import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Purchases.css';
import NavBar from '../NavBar';
import Footer from '../Footer';

function Purchases() {
  const { isAuthenticated, token, refreshing } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Use the API service which has the correct base URL configured
        const response = await api.get('/orders');
        console.log('Orders fetched successfully:', response.data);
        setOrders(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load your purchase history. Please try again later.');
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, navigate, token]);

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

  const renderOrders = () => {
    if (loading) {
      return (
        <div className="purchase-loading-state">
          <div className="purchase-loading-spinner"></div>
          <p>Loading your purchase history...</p>
        </div>
      );
    }

    if (error) {
      return <div className="purchase-error-message">{error}</div>;
    }

    if (orders.length === 0) {
      return (
        <div className="purchase-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#800000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <h3>No purchases yet</h3>
          <p>You haven't made any purchases yet. Browse our shop to find something you like!</p>
          <button className="purchase-shop-now-btn" onClick={() => navigate('/shop')}>
            Shop Now
          </button>
        </div>
      );
    }

    return (
      <div className="purchase-orders-list">
        {orders.map(order => {
          // Get waybill information
          let trackingInfo = null;
          
          // Example implementation for checking tracking/shipping info
          if (order.shipping_status) {
            trackingInfo = {
              status: order.shipping_status,
              number: order.tracking_number || "Processing"
            };
          }
          
          return (
            <div className="purchase-order-item-card" key={order.order_id}>
              <div className="purchase-order-header">
                <div className="purchase-order-date">
                  <span>Order Placed:</span> {formatDate(order.created_at)}
                </div>
                <div className="purchase-order-id">
                  <span>Order ID:</span> {order.order_id}
                </div>
              </div>
              <div className="purchase-order-details">
                <div className="purchase-order-status-container">
                  <div 
                    className="purchase-order-status" 
                    style={{ 
                      color: getStatusColor(order.order_status),
                      backgroundColor: getStatusBgColor(order.order_status),
                      borderColor: getStatusColor(order.order_status)
                    }}
                  >
                    {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace(/_/g, ' ')}
                  </div>
                  {order.payment_status && (
                    <div className="purchase-payment-status">
                      Payment: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </div>
                  )}
                  {trackingInfo && (
                    <div className="purchase-tracking-info">
                      <span className="purchase-tracking-label">Waybill No.:</span> {trackingInfo.number}
                    </div>
                  )}
                </div>
                <div className="purchase-order-summary">
                  <div className="purchase-order-count">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</div>
                  <div className="purchase-order-total">₱{parseFloat(order.total_price).toFixed(2)}</div>
                </div>
              </div>
              <div className="purchase-order-actions">
                <Link to={`/account/orders/${order.order_id}`} className="purchase-view-details-btn">
                  View Details
                </Link>
                {order.tracking_number && (
                  <Link to={`/account/tracking/${order.order_id}`} className="purchase-track-order-btn">
                    Track Order
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
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

  return (
    <div className="purchase-account-page">
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
      <div className="purchase-account-container">
        <div className="purchase-account-wrapper">
          <h1 className="purchase-account-title">My Purchases</h1>
          <div className="purchases-section">
            {renderOrders()}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Purchases; 