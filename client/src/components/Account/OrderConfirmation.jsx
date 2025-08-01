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
import { getFullImageUrl } from '../../utils/imageUtils';

function OrderConfirmation() {
  const { orderId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const handleCancelOrder = async () => {
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

  const handleImageError = (event) => {
    console.log('Image failed to load, using fallback');
    event.target.onerror = null; // Prevent infinite loop
    event.target.src = '/ImageFallBack.png';
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
          
          // Debug: Log the order data to see what values we're getting
          console.log('Order data received:', {
            total_price: response.data.total_price,
            total_product_price: response.data.total_product_price,
            total_shipping_fee: response.data.total_shipping_fee,
            shipping_fee: response.data.shipping_fee,
            subtotal: response.data.subtotal,
            discount: response.data.discount,
            product_discount: response.data.product_discount,
            shipping_discount: response.data.shipping_discount
          });
        } else {
          setOrder(response.data);
          
          // Debug: Log the order data to see what values we're getting
          console.log('Order data received (no items):', {
            total_price: response.data.total_price,
            total_product_price: response.data.total_product_price,
            total_shipping_fee: response.data.total_shipping_fee,
            shipping_fee: response.data.shipping_fee,
            subtotal: response.data.subtotal,
            discount: response.data.discount,
            product_discount: response.data.product_discount,
            shipping_discount: response.data.shipping_discount
          });
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
                      // Use the exact shipping address that was sent to Ninja Van
                      if (order.shipping?.address) {
                        return order.shipping.address;
                      }
                      
                      // Fallback to shipping_address field
                      if (order.shipping_address) {
                        return order.shipping_address;
                      }
                      
                      // Final fallback to order.address if available
                      if (order.address) {
                        return order.address;
                      }
                      
                      return 'Not provided';
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
                    <img 
                      src={getFullImageUrl(item.image_url)} 
                      alt={item.product_name}
                      onError={handleImageError}
                    />
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
                <span>₱{parseFloat(
                  order.total_product_price || 
                  order.subtotal || 
                  (order.total_price - parseFloat(order.total_shipping_fee || 0))
                ).toFixed(2)}</span>
              </div>
              {order.product_discount > 0 && (
                <div className="summary-row">
                  <span>Product Discount:</span>
                  <span>-₱{parseFloat(order.product_discount).toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping:</span>
                <span>₱{parseFloat(
                  order.total_shipping_fee || 
                  order.shipping_fee || 
                  0
                ).toFixed(2)}</span>
              </div>
              {order.shipping_discount > 0 && (
                <div className="summary-row">
                  <span>Shipping Discount:</span>
                  <span>-₱{parseFloat(order.shipping_discount).toFixed(2)}</span>
                </div>
              )}
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