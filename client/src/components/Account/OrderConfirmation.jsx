import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ninjaVanService from '../../services/ninjaVanService';
import CancelOrderModal from '../common/CancelOrderModal';
import TrackingDisplay from '../DeliveryTracking/TrackingDisplay';
import './OrderConfirmation.css';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { notify } from '../../utils/notifications';
import { FaArrowLeft } from 'react-icons/fa';

function OrderConfirmation() {
  const { orderId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Handle opening cancel modal
  const handleCancelOrder = () => {
    setCancelModalOpen(true);
  };

  // Handle order cancellation success
  const handleOrderCancelled = (orderId, cancelData) => {
    // Update the order status in the local state
    setOrder(prevOrder => ({
      ...prevOrder,
      order_status: 'cancelled'
    }));
    
    // Close the modal
    setCancelModalOpen(false);
    
    // Show success message and redirect after a delay
    setTimeout(() => {
      navigate('/account/purchases');
    }, 2000);
  };

  const handleMarkReceived = async () => {
    try {
      const response = await api.put(`/orders/${orderId}/mark-received`);
      setOrder(prev => ({ ...prev, order_status: 'completed' }));
      notify.success('Thank you! Order marked as received.');
    } catch (err) {
      console.error('Mark received error:', err);
      notify.error(err.response?.data?.message || 'Failed to update order');
    }
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${orderId}`);
        
        // Fetch product images for each item
        if (response.data && response.data.items) {
          const itemsWithImages = await Promise.all(
            response.data.items.map(async (item) => {
              try {
                if (item.product_id) {
                  const imageResponse = await api.get(`/products/${item.product_id}/image`);
                  return {
                    ...item,
                    image_url: imageResponse.data.url
                  };
                }
                return item;
              } catch (err) {
                console.warn(`Failed to fetch image for product ${item.product_id}:`, err);
                return item;
              }
            })
          );
          
          setOrder({
            ...response.data,
            items: itemsWithImages
          });
        } else {
          setOrder(response.data);
        }
        
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

  if (loading) {
    return (
      <div className="order-page">
        <NavBar />
        <div className="order-loading">
            <p>Loading order details...</p>
        </div>
        <Footer forceShow={false} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-page">
        <NavBar />
        <div className="order-error">
            <p>{error || 'Order not found.'}</p>
          <Link to="/account/purchases" className="back-link">
              <FaArrowLeft /> Back to Orders
            </Link>
        </div>
        <Footer forceShow={false} />
      </div>
    );
  }

  return (
    <div className="order-page">
      <NavBar />
      <div className="hero-banner">
        <h1>Order Details</h1>
        <Link to="/shop">
          <button className="shop-more-btn">SHOP MORE NOW</button>
        </Link>
      </div>

      <div className="order-content">
          <div className="order-header">
          <Link to="/account/purchases" className="back-link">
            <FaArrowLeft /> Back to Orders
          </Link>
          {ninjaVanService.canCancelOrder(order.order_status) && (
            <button 
              className="cancel-order-btn" 
              onClick={handleCancelOrder}
              title="Cancel this order"
            >
              Cancel Order
            </button>
          )}
          {['delivered','received'].includes(order.order_status) && (
            <button 
              className="cancel-order-btn"
              onClick={handleMarkReceived}
              title="Confirm you have received this order"
            >
              Order Received
            </button>
          )}
          </div>

        <div className="order-card">
          <div className="section-title">ORDER INFORMATION</div>
          
          {/* Add Order Status Tracking Graphics */}
          <div className="order-status-section">
            <TrackingDisplay orderStatus={order.order_status} />
          </div>
          
          <div className="order-info-grid">
            <div className="info-item">
              <span className="label">Order Code</span>
              <span className="value">{order.order_code || order.order_id}</span>
            </div>
            <div className="info-item">
              <span className="label">Order Date</span>
              <span className="value">{formatDate(order.created_at)}</span>
            </div>
            {order.tracking_number && (
              <div className="info-item">
                <span className="label">Tracking Number</span>
                <span className="value">{order.tracking_number}</span>
              </div>
            )}
            </div>
            
          <div className="details-container">
            <div className="shipping-section">
              <h3>Shipping Details</h3>
              <div className="details-content">
                <div className="detail-row">
                  <span className="label">Name</span>
                  <span className="value">{order.shipping?.name || `${order.first_name} ${order.last_name}` || 'Not provided'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone</span>
                  <span className="value">{order.shipping?.phone || order.phone || 'Not provided'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email</span>
                  <span className="value">{order.shipping?.email || order.email || 'Not provided'}</span>
              </div>
                <div className="detail-row">
                  <span className="label">Delivery Address</span>
                  <span className="value">
                    {(() => {
                      // Priority 1: Use the exact shipping address from the backend (which now includes NinjaVan address)
                      if (order.shipping?.address) {
                        return order.shipping.address;
                      }
                      
                      // Priority 2: Use shipping_address field (fallback)
                      if (order.shipping_address) {
                        return order.shipping_address;
                      }
                      
                      // Priority 3: Final fallback to order.address if available
                      if (order.address) {
                        return order.address;
                      }
                      
                      return 'Address not available';
                    })()}
                  </span>
            </div>
              </div>
            </div>
            
            <div className="payment-section">
              <h3>Payment Details</h3>
              <div className="details-content">
                {/* Show Method if payment_status contains 'cod' or payment_method is 'cod' */}
                {(order.payment?.payment_method === 'cod' || (order.payment_status && order.payment_status.toLowerCase().includes('cod'))) && (
                  <div className="detail-row">
                    <span className="label">Method</span>
                    <span className="value">Cash on Delivery (COD)</span>
                  </div>
                )}
                {order.payment?.payment_method === 'dragonpay' && (
                  <>
                    <div className="detail-row">
                      <span className="label">Method</span>
                      <span className="value">Dragonpay</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Reference</span>
                      <span className="value">{order.payment?.reference_number || order.payment?.transaction_id || 'Pending'}</span>
                    </div>
                  </>
                )}
                {order.payment_status && (
                  <div className="detail-row">
                    <span className="label">Status</span>
                    <span className="value">
                      {order.payment?.payment_method === 'cod' || (order.payment_status && order.payment_status.toLowerCase().includes('cod'))
                        ? (order.payment_status === 'cod_pending'
                          ? 'Pending (Pay upon delivery)'
                          : order.payment_status)
                        : order.payment?.payment_status || order.payment_status || 'Not provided'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="order-items-section">
            <h3>Order Items</h3>
            <div className="items-list">
              {order.items && order.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-image">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} />
                    ) : (
                      <div className="no-image-placeholder">
                        <i className="fas fa-image"></i>
                      </div>
                    )}
                  </div>
                  <div className="item-info">
                    <h4>{item.product_name}</h4>
                    <p className="product-code">Product Code: {item.product_code}</p>
                  </div>
                  <div className="item-pricing">
                    <span className="price">₱{parseFloat(item.price).toFixed(2)}</span>
                    <span className="quantity">× {item.quantity}</span>
                    <span className="total">₱{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              </div>
              
            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₱{parseFloat(order.subtotal || order.total_price).toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="summary-row">
                  <span>Discount:</span>
                  <span>-₱{parseFloat(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping:</span>
                <span>₱{parseFloat(order.shipping_fee || 0).toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>₱{parseFloat(order.total_price).toFixed(2)}</span>
              </div>
            </div>
              </div>
            </div>
          </div>
      <Footer forceShow={false} />
      {cancelModalOpen && order && (
        <CancelOrderModal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          onOrderCancelled={handleOrderCancelled}
          order={order}
        />
      )}
    </div>
  );
}

export default OrderConfirmation;