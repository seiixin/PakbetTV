import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Purchases.css';
import NavBar from '../NavBar';
import Footer from '../Footer';

function Purchases() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Order status options for filter
  const orderStatusFilters = [
    { key: 'all', label: 'All Orders' },
    { key: 'processing', label: 'Processing' },
    { key: 'for_packing', label: 'Packing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' }
  ];

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

        const response = await api.get('/api/orders');
        
        // Check if response is valid JSON
        if (typeof response.data === 'string') {
          console.error('Invalid response format:', response.data);
          setError('Invalid response from server. Please try again later.');
          setOrders([]);
          setFilteredOrders([]);
          return;
        }

        // Ensure response.data is an array
        const ordersData = Array.isArray(response.data) ? response.data : [];
        console.log('Orders fetched successfully:', ordersData);
        
        setOrders(ordersData);
        setFilteredOrders(ordersData);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load your purchase history. Please try again later.');
        setOrders([]);
        setFilteredOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, navigate, token]);

  // Apply filter when activeFilter changes or orders change
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => {
        // Special case for "Packing" which includes multiple statuses
        if (activeFilter === 'for_packing') {
          return ['for_packing', 'packed'].includes(order.order_status.toLowerCase());
        }
        // Otherwise just match the status
        return order.order_status.toLowerCase() === activeFilter;
      });
      setFilteredOrders(filtered);
    }
  }, [activeFilter, orders]);

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

    if (filteredOrders.length === 0) {
      return (
        <div className="purchase-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#800000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <h3>No orders found</h3>
          <p>{activeFilter === 'all' ? "You haven't made any purchases yet." : `No orders with status "${orderStatusFilters.find(f => f.key === activeFilter)?.label}" found.`}</p>
          <button className="purchase-shop-now-btn" onClick={() => navigate('/shop')}>
            Shop Now
          </button>
        </div>
      );
    }

    return (
      <div className="purchase-orders-list">
        {filteredOrders.map(order => {
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
                  <span>Order Code:</span> {order.order_code || order.order_id}
                </div>
              </div>
              <div className="purchase-order-details">
                <div className="purchase-order-status-container">
                  <div 
                    className="purchase-order-status" 
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
                  {order.payment_status && (
                    <div className="purchase-payment-status">
                      Payment: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </div>
                  )}
                  {order.tracking_number && (
                    <div className="purchase-tracking-info">
                      <span className="purchase-tracking-label">Waybill No.:</span> {order.tracking_number}
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
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="purchase-account-page">
      <NavBar />
      <div className="purchase-account-container">
        <div className="purchase-account-wrapper">
          <div className="purchase-filter-navbar">
            <h2 className="purchase-orders-title">Order History</h2>
            <div className="purchase-filter-tabs">
              {orderStatusFilters.map(filter => (
                <button
                  key={filter.key}
                  className={`purchase-filter-tab ${activeFilter === filter.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
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