import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import TrackingDisplay from '../components/DeliveryTracking/TrackingDisplay';
import './OrderTracking.css';

const OrderTracking = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { orderId } = useParams();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('You must be logged in to view order tracking');
          setLoading(false);
          return;
        }
        const response = await axios.get(`/api/orders/${orderId}`, {
          headers: {
            'x-auth-token': token
          }
        });
        setOrder(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to fetch order details');
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const getOrderProgress = () => {
    if (!order) return 0;
    const statusMap = {
      'pending': 20,
      'processing': 40,
      'shipped': 60,
      'out_for_delivery': 80,
      'completed': 100,
      'cancelled': 0
    };
    return statusMap[order.order_status.toLowerCase()] || 0;
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order\nPlaced' },
      { key: 'processing', label: 'Processing\nOrder' },
      { key: 'shipped', label: 'Order\nShipped' },
      { key: 'out_for_delivery', label: 'Out for\nDelivery' },
      { key: 'completed', label: 'Order\nCompleted' }
    ];

    if (!order) return steps.map(step => ({ ...step, active: false }));

    const currentStatusIndex = steps.findIndex(step => 
      step.key === order.order_status.toLowerCase()
    );

    return steps.map((step, index) => ({
      ...step,
      active: index <= currentStatusIndex && order.order_status.toLowerCase() !== 'cancelled'
    }));
  };

  if (loading) {
    return (
      <div className="order-tracking-container">
        <div className="app-container">
          <div className="loading-spinner">
            <span className="visually-hidden">Loading...</span>
            <p>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-tracking-container">
        <div className="app-container">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
            <Link to="/orders" className="btn-primary">
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-tracking-container">
        <div className="app-container">
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Order not found</p>
            <Link to="/orders" className="btn-primary">
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasTracking = order.shipping && order.shipping.tracking_number;

  return (
    <div className="order-tracking-container">
      <div className="app-container">
        <article className="order-card">
          <h3>Order Tracking</h3>
          
          <div className="top-row">
            <div>
              <h4>Order #{order.order_id}</h4>
              <p>Date: {new Date(order.created_at).toLocaleString()}</p>
              <p>Payment Status: {order.payment ? order.payment.status : 'N/A'}</p>
            </div>
            <div>
              <p className="complete-label">Progress</p>
              <p className="complete-percent">{getOrderProgress()}<span>%</span></p>
              <div className="progress-bar">
                <div 
                  className="progress-bar-inner" 
                  style={{ width: `${getOrderProgress()}%` }}
                ></div>
              </div>
            </div>
            <div>
              <p className="expected-label">Total Amount</p>
              <p className="expected-date">₱{parseFloat(order.total_price).toFixed(2)}</p>
              <p className="expected-days">
                Status: <span className={`status-badge ${order.order_status.toLowerCase()}`}>
                  {order.order_status}
                </span>
              </p>
            </div>
          </div>

          <div className="progress-steps-container">
            <div className="progress-steps">
              {getStatusSteps().map((step, index) => (
                <div key={step.key} className={`progress-step ${step.active ? 'active' : ''}`}>
                  <div className="circle">
                    <div className="circle-inner"></div>
                  </div>
                  {step.label}
                </div>
              ))}
            </div>
          </div>

          {hasTracking && (
            <div className="tracking-section">
              <div className="tracking-info">
                <p>
                  <strong>Tracking Number:</strong> {order.shipping.tracking_number}
                  <span className="carrier-badge">
                    {order.shipping.carrier || 'NinjaVan'}
                  </span>
                </p>
              </div>
              <TrackingDisplay trackingId={order.shipping.tracking_number} />
            </div>
          )}

          {!hasTracking && (
            <div className="recommendations">
              <div className="recommendation yellow">
                <div className="text">
                  <div className="dot"></div>
                  Your order is being processed. Tracking information will be available once shipped.
                </div>
              </div>
            </div>
          )}

          <div className="order-actions">
            <Link to="/orders" className="btn-primary">
              Back to Orders
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
};

export default OrderTracking; 