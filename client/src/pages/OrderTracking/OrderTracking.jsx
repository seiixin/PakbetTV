import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import '../../components/Account/Account.css';

function OrderTracking() {
  const { orderId } = useParams();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderTracking = async () => {
      try {
        setLoading(true);
        // Fetch order details
        const orderResponse = await api.get(`/orders/${orderId}`);
        setOrder(orderResponse.data);

        // Fetch tracking information if available
        if (orderResponse.data.tracking_number) {
          const trackingResponse = await api.get(`/tracking/${orderResponse.data.tracking_number}`);
          setTrackingData(trackingResponse.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tracking information:', err);
        setError('Unable to load tracking information. Please try again later.');
        setLoading(false);
      }
    };

    if (isAuthenticated && orderId) {
      fetchOrderTracking();
    }
  }, [isAuthenticated, orderId]);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  // Mock tracking events for demo purposes
  // In a real application, this would come from the tracking API
  const getTrackingEvents = () => {
    if (!order) return [];
    
    // If we have real tracking data, use it
    if (trackingData && trackingData.events) {
      return trackingData.events;
    }
    
    // Otherwise, generate mock events based on order status
    const mockEvents = [];
    const orderDate = new Date(order.created_at);
    
    // Order placed
    mockEvents.push({
      status: 'Order Placed',
      date: order.created_at,
      location: 'Online',
      description: 'Your order has been received and is being processed.'
    });
    
    // Payment confirmed
    if (['processing', 'for_packing', 'packed', 'for_shipping', 'shipped', 'picked_up', 'delivered', 'completed'].includes(order.order_status)) {
      const paymentDate = new Date(orderDate);
      paymentDate.setHours(paymentDate.getHours() + 1);
      mockEvents.push({
        status: 'Payment Confirmed',
        date: paymentDate.toISOString(),
        location: 'Online',
        description: 'Your payment has been confirmed.'
      });
    }
    
    // Order processing
    if (['for_packing', 'packed', 'for_shipping', 'shipped', 'picked_up', 'delivered', 'completed'].includes(order.order_status)) {
      const processingDate = new Date(orderDate);
      processingDate.setHours(processingDate.getHours() + 6);
      mockEvents.push({
        status: 'Order Processing',
        date: processingDate.toISOString(),
        location: 'Warehouse',
        description: 'Your order is being prepared for shipment.'
      });
    }
    
    // Order packed
    if (['packed', 'for_shipping', 'shipped', 'picked_up', 'delivered', 'completed'].includes(order.order_status)) {
      const packedDate = new Date(orderDate);
      packedDate.setHours(packedDate.getHours() + 24);
      mockEvents.push({
        status: 'Order Packed',
        date: packedDate.toISOString(),
        location: 'Warehouse',
        description: 'Your order has been packed and is ready for shipping.'
      });
    }
    
    // Shipped
    if (['shipped', 'picked_up', 'delivered', 'completed'].includes(order.order_status)) {
      const shippedDate = new Date(orderDate);
      shippedDate.setHours(shippedDate.getHours() + 30);
      mockEvents.push({
        status: 'Shipped',
        date: shippedDate.toISOString(),
        location: 'Distribution Center',
        description: 'Your order has been shipped and is on its way to you.'
      });
    }
    
    // Delivered
    if (['delivered', 'completed'].includes(order.order_status)) {
      const deliveredDate = new Date(orderDate);
      deliveredDate.setHours(deliveredDate.getHours() + 78);
      mockEvents.push({
        status: 'Delivered',
        date: deliveredDate.toISOString(),
        location: 'Destination',
        description: 'Your order has been delivered successfully.'
      });
    }
    
    return mockEvents.reverse(); // Most recent first
  };

  const renderOrderSummary = () => {
    if (!order) return null;
    
    // Mock data for order items if real data is not available
    const items = order.items || [
      {
        product_name: "Feng Shui Wealth Bracelet",
        price: order.total_price / 1.5,
        quantity: 1,
        image_url: "/images/products/wealth-bracelet.jpg"
      },
      {
        product_name: "Lucky Bamboo Plant",
        price: order.total_price / 3,
        quantity: 1,
        image_url: "/images/products/lucky-bamboo.jpg"
      }
    ];

    return (
      <div className="order-summary-panel">
        <h3 className="summary-title">Order Summary</h3>
        <div className="order-items-list">
          {items.map((item, index) => (
            <div className="summary-item" key={index}>
              <div className="summary-item-info">
                <div className="summary-item-name">{item.product_name}</div>
                <div className="summary-item-price">₱{parseFloat(item.price).toFixed(2)} × {item.quantity}</div>
              </div>
              <div className="summary-item-total">
                ₱{(parseFloat(item.price) * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="order-totals">
          <div className="totals-row">
            <span>Subtotal:</span>
            <span>₱{parseFloat(order.total_price).toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>Shipping:</span>
            <span>₱0.00</span>
          </div>
          <div className="totals-row total">
            <span>Total:</span>
            <span>₱{parseFloat(order.total_price).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTrackingContent = () => {
    if (loading) {
      return (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading tracking information...</p>
        </div>
      );
    }

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    if (!order) {
      return <div className="error-message">Order not found.</div>;
    }

    const trackingEvents = getTrackingEvents();

    return (
      <div className="tracking-container">
        <div className="tracking-header">
          <div className="tracking-order-info">
            <div className="tracking-number">
              <span>Tracking Number:</span> {order.tracking_number || 'Not available yet'}
            </div>
            <div className="order-id-display">
              <span>Order ID:</span> {order.order_id}
            </div>
          </div>
          <div className="order-status" 
            style={{ 
              color: getStatusColor(order.order_status),
              backgroundColor: getStatusBgColor(order.order_status),
              borderColor: getStatusColor(order.order_status)
            }}>
            {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace(/_/g, ' ')}
          </div>
        </div>

        <div className="tracking-content-wrapper">
          <div className="tracking-progress">
            <h3 className="tracking-section-title">Delivery Status</h3>
            <div className="timeline">
              {trackingEvents.map((event, index) => (
                <div className={`timeline-item ${index === 0 ? 'active' : ''}`} key={index}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h3>{event.status}</h3>
                    <div className="timeline-details">
                      <div className="timeline-date">{formatDate(event.date)}</div>
                      <div className="timeline-location">{event.location}</div>
                    </div>
                    <p className="timeline-description">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {renderOrderSummary()}
        </div>

        <div className="tracking-actions">
          <Link to={`/account/orders/${orderId}`} className="back-to-order-btn">
            Back to Order Details
          </Link>
          <Link to="/account/purchases" className="all-orders-btn">
            All Orders
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="account-container">
      <div className="account-wrapper">
        <h1 className="account-title">Order Tracking</h1>
        <div className="account-navigation">
          <Link to="/account" className="account-nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </Link>
          <Link to="/account/purchases" className="account-nav-item">
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
          {renderTrackingContent()}
        </div>
      </div>
    </div>
  );
}

export default OrderTracking; 