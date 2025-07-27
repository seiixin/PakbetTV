import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ninjaVanService from '../../services/ninjaVanService';
import CancelOrderModal from '../common/CancelOrderModal';
import './Purchases.css';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { notify } from '../../utils/notifications';

function Purchases() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Hero Component
  const Hero = () => {
    return (
      <section className="purchase-hero" role="banner" tabIndex="0">
        <div className="purchase-hero-text">
          Track your Order History
        </div>
        <p>View and manage all your Feng Shui orders in one place</p>
      </section>
    );
  };

  // Order status options for filter
  const orderStatusFilters = [
    { key: 'all', label: 'All Orders' },
    { key: 'processing', label: 'Processing' },
    { key: 'for_packing', label: 'Packing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' }
  ];

  // Handle opening cancel modal
  const handleCancelOrder = (order) => {
    setSelectedOrder(order);
    setCancelModalOpen(true);
  };

  // Handle order cancellation success
  const handleOrderCancelled = (orderId, cancelData) => {
    // Update the order status in the local state
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.order_id === orderId 
          ? { ...order, order_status: 'cancelled' }
          : order
      )
    );
    
    // Close the modal
    setCancelModalOpen(false);
    setSelectedOrder(null);
  };

  // Handle "Continue Payment" functionality
  const handleContinuePayment = async (order) => {
    try {
      console.log('Continue payment for order:', order.order_id);
      
      // Get payment URL from backend
      const response = await api.get(`/transactions/payment-url/${order.order_id}`);
      
      if (response.data.success) {
        const { payment_url, hours_remaining } = response.data;
        
        // Show notification about time remaining
        notify.info(`You have ${Math.ceil(hours_remaining)} hours remaining to complete payment.`);
        
        // Redirect to DragonPay payment
        window.location.href = payment_url;
      } else {
        // Handle specific error cases
        if (response.data.expired) {
          notify.error('Payment window has expired. Please place a new order.');
        } else if (response.data.completed) {
          notify.info('Payment has already been processed for this order.');
          // Refresh orders to update status
          fetchOrders();
        } else {
          notify.error(response.data.message || 'Unable to continue payment at this time.');
        }
      }
    } catch (error) {
      console.error('Error continuing payment:', error);
      if (error.response?.status === 401) {
        notify.error('Please log in to continue payment.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        notify.error('Payment information not found for this order.');
      } else {
        notify.error('Failed to retrieve payment information. Please try again.');
      }
    }
  };

  // Check if order can continue payment
  const canContinuePayment = (order) => {
    // Order must be in pending/processing status with unpaid payment status
    const validOrderStatuses = ['pending', 'processing', 'pending_payment'];
    const validPaymentStatuses = ['pending', 'awaiting_for_confirmation'];
    
    console.log('[Continue Payment Check]', {
      order_id: order.order_id,
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      validOrderStatus: validOrderStatuses.includes(order.order_status),
      validPaymentStatus: validPaymentStatuses.includes(order.payment_status),
      notCOD: order.payment_method !== 'cod',
      canContinue: validOrderStatuses.includes(order.order_status) && 
                   validPaymentStatuses.includes(order.payment_status) &&
                   order.payment_method !== 'cod'
    });
    
    return validOrderStatuses.includes(order.order_status) && 
           validPaymentStatuses.includes(order.payment_status) &&
           order.payment_method !== 'cod'; // Don't show for COD orders
  };

  // Fetch orders function
  const fetchOrders = async () => {
    try {
      setLoading(true);
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.get('/orders');
      
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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, navigate, token]);

  // Apply filter when activeFilter changes or orders change
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredOrders(orders);
      return;
    }

    // Debug log to see what statuses we're getting
    console.log('Current orders and their statuses:', orders.map(order => ({
      id: order.order_id,
      status: order.order_status,
      normalizedStatus: order.order_status?.toLowerCase()
    })));
    console.log('Active filter:', activeFilter);

    const filtered = orders.filter(order => {
      // Safely handle potential undefined/null status
      const status = (order.order_status || '').toLowerCase().trim();
      
      // Debug log for each filter operation
      console.log(`Checking order ${order.order_id} with status "${status}" against filter "${activeFilter}"`);
      
      // Define status groups
      const statusGroups = {
        processing: ['processing', 'pending_payment', 'pending'],
        for_packing: ['for_packing', 'packed', 'for_shipping', 'ready_to_ship'],
        shipped: ['shipped', 'picked_up', 'in_transit', 'out_for_delivery'],
        delivered: ['delivered', 'received'],
        completed: ['completed', 'finished']
      };

      // Check if the order status belongs to the selected filter group
      return statusGroups[activeFilter]?.includes(status) || false;
    });

    console.log('Filtered orders:', filtered.map(order => ({
      id: order.order_id,
      status: order.order_status
    })));
    
    setFilteredOrders(filtered);
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

  const getShippingAddress = (order) => {
    // Use the exact shipping address that was sent to Ninja Van
    if (order.shipping_address) {
      return order.shipping_address;
    }
    
    return 'Address information not available';
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
            <div className="purchase-order-item-card" key={`${order.order_id}-${order.created_at}`}>
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
                {canContinuePayment(order) && (
                  <button 
                    className="purchase-continue-payment-btn" 
                    onClick={() => handleContinuePayment(order)}
                    title="Continue payment for this order"
                  >
                    Continue Payment
                  </button>
                )}
                {ninjaVanService.canCancelOrder(order.order_status) && (
                  <button 
                    className="purchase-cancel-btn" 
                    onClick={() => handleCancelOrder(order)}
                    title="Cancel this order"
                  >
                    Cancel Order
                  </button>
                )}
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
      <Hero />
      <div className="purchase-account-container">
        <div className="purchase-account-wrapper">
          <div className="purchase-filter-navbar">
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
      <Footer forceShow={false} />
      {cancelModalOpen && selectedOrder && (
        <CancelOrderModal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          onOrderCancelled={handleOrderCancelled}
          order={selectedOrder}
        />
      )}
    </div>
  );
}

export default Purchases; 