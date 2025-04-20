import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Account.css';

function Purchases() {
  const { isAuthenticated, getToken } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);

  // Mock data for demonstration
  const mockOrders = [
    {
      order_id: '2504199PH14KBN',
      total_price: '200.00',
      order_status: 'processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payment_status: 'completed',
      shipping_status: 'pending',
      item_count: 4
    }
  ];

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        setOrders(data);
        
        // If no orders, automatically use mock data for demo
        if (data.length === 0) {
          setUseMockData(true);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load your purchase history. Please try again later.');
        // Use mock data if there's an error for demonstration
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, navigate, getToken]);

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
      'pending': '#ff9800',
      'processing': '#2196f3',
      'shipped': '#9c27b0',
      'delivered': '#4caf50',
      'completed': '#4caf50',
      'cancelled': '#f44336'
    };
    return statusColors[status] || '#757575';
  };

  const getDisplayOrders = () => {
    return useMockData ? mockOrders : orders;
  };

  const renderOrders = () => {
    const displayOrders = getDisplayOrders();
    
    if (loading) {
      return (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading your purchase history...</p>
        </div>
      );
    }

    if (error && !useMockData) {
      return <div className="error-message">{error}</div>;
    }

    if (displayOrders.length === 0) {
      return (
        <div className="empty-purchases">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <h3>No purchases yet</h3>
          <p>You haven't made any purchases yet. Browse our shop to find something you like!</p>
          <button className="shop-now-btn" onClick={() => navigate('/shop')}>
            Shop Now
          </button>
        </div>
      );
    }

    return (
      <div className="orders-list">
        {displayOrders.map(order => (
          <Link to={`/account/orders/${order.order_id}`} key={order.order_id} className="order-item-link">
            <div className="order-item-card">
              <div className="order-header">
                <div className="order-date">
                  <span>Order Placed:</span> {formatDate(order.created_at)}
                </div>
                <div className="order-id">
                  <span>Order ID:</span> {order.order_id}
                </div>
              </div>
              
              <div className="order-details">
                <div className="order-status-container">
                  <div 
                    className="order-status" 
                    style={{ backgroundColor: getStatusColor(order.order_status) }}
                  >
                    {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                  </div>
                  
                  {order.payment_status && (
                    <div className="payment-status">
                      Payment: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </div>
                  )}
                </div>
                
                <div className="order-summary">
                  <div className="order-count">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</div>
                  <div className="order-total">₱{parseFloat(order.total_price).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="view-details">
                View Order Details
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          </Link>
        ))}
        
        {useMockData && (
          <div className="mock-data-notice">
            <p>* This is demo data. In a production environment, you'll see your actual orders here.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="account-container">
      <div className="account-wrapper">
        <h1 className="account-title">My Purchases</h1>
        
        <div className="account-navigation">
          <Link to="/account" className="account-nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </Link>
          <Link to="/account/purchases" className="account-nav-item active">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            Purchases
          </Link>
          <Link to="/cart" className="account-nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Cart
          </Link>
        </div>
        
        <div className="purchases-section">
          {renderOrders()}
        </div>
      </div>
    </div>
  );
}

export default Purchases; 