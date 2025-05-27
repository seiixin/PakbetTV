import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './OrderConfirmation.css';
import NavBar from '../NavBar';
import Footer from '../Footer';
import { notify } from '../../utils/notifications';
import { FaArrowLeft } from 'react-icons/fa';
import API_BASE_URL from '../../config';

// Define placeholder image path as a constant to ensure consistency
const PLACEHOLDER_IMAGE = `${API_BASE_URL}/placeholder-product.jpg`;

const getFullImageUrl = (url) => {
  if (!url) return PLACEHOLDER_IMAGE;
  
  // Handle case where url is an object (longblob from database)
  if (typeof url === 'object') {
    if (url.data) {
      // Handle Buffer or Uint8Array data
      if (url.data instanceof Uint8Array || Buffer.isBuffer(url.data)) {
        return `data:${url.type || 'image/jpeg'};base64,${Buffer.from(url.data).toString('base64')}`;
      }
      // Handle base64 string data
      if (typeof url.data === 'string') {
        return `data:${url.type || 'image/jpeg'};base64,${url.data}`;
      }
    }
    // If the object itself is a Buffer or Uint8Array
    if (url instanceof Uint8Array || Buffer.isBuffer(url)) {
      return `data:image/jpeg;base64,${Buffer.from(url).toString('base64')}`;
    }
    return PLACEHOLDER_IMAGE;
  }
  
  // Handle string URLs
  if (typeof url === 'string') {
    // Handle base64 encoded images
    if (url.startsWith('data:')) {
      return url; // Already a full data URL
    }
    
    // Handle absolute URLs
    if (url.startsWith('http')) return url;
    
    // Handle uploads paths
    if (url.startsWith('/uploads/')) return `${API_BASE_URL}${url}`;
    
    // Handle other relative paths
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    
    // Any other format
    return `${API_BASE_URL}/uploads/${url}`;
  }
  
  return PLACEHOLDER_IMAGE;
};

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
        
        // Process image data in items if needed
        if (response.data && response.data.items) {
          response.data.items = response.data.items.map(item => {
            console.log('Item image data:', item.image_url);
            return {
              ...item,
              // If image_url is null, try to use product code to construct a fallback path
              image_url: item.image_url || (item.product_code 
                ? `/uploads/products/product-${item.product_code}.jpg`
                : null)
            };
          });
        }
        
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
              </div>

        <div className="order-card">
          <div className="section-title">ORDER INFORMATION</div>
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
                  <span className="value">{order.shipping?.address || order.address || 'Not provided'}</span>
            </div>
              </div>
            </div>
            
            <div className="payment-section">
              <h3>Payment Details</h3>
              <div className="details-content">
                <div className="detail-row">
                  <span className="label">Method</span>
                  <span className="value">{order.payment?.payment_method || 'Not provided'}</span>
              </div>
                <div className="detail-row">
                  <span className="label">Transaction ID</span>
                  <span className="value">{order.payment?.transaction_id || 'Pending'}</span>
            </div>
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
                      onError={(e) => { 
                        console.error('Image load error:', e.target.src); 
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.src = PLACEHOLDER_IMAGE; 
                      }}
                      loading="lazy"
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
                    <span>Subtotal</span>
                    <span>₱{parseFloat(order.total_price).toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span>₱0.00</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>₱{parseFloat(order.total_price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
      <Footer forceShow={false} />
    </div>
  );
}

export default OrderConfirmation; 