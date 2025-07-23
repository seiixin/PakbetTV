import React from 'react';
import './TrackingDisplay.css';
import { FaBoxOpen, FaBox, FaShippingFast, FaTruck, FaCheckCircle } from 'react-icons/fa';

const TrackingDisplay = ({ trackingData, orderStatus }) => {
  if (!trackingData && !orderStatus) {
    return <div className="tracking-unavailable">Tracking information not available yet.</div>;
  }

  // Define the stages for the order tracking with better mapping
  const stages = [
    { key: 'processing', label: 'Processing', icon: <FaBoxOpen />, description: 'Order is being prepared' },
    { key: 'packing', label: 'Packing', icon: <FaBox />, description: 'Items are being packed' },
    { key: 'shipping', label: 'Shipped', icon: <FaShippingFast />, description: 'Package is in transit' },
    { key: 'delivery', label: 'Delivery', icon: <FaTruck />, description: 'Out for delivery' },
    { key: 'completed', label: 'Received', icon: <FaCheckCircle />, description: 'Order completed' }
  ];

  // Enhanced status mapping
  const getStageIndex = (status) => {
    const statusMap = {
      'pending_payment': -1,
      'processing': 0,
      'for_packing': 1,
      'packed': 1,
      'for_shipping': 2,
      'shipped': 2,
      'picked_up': 2,
      'out_for_delivery': 3,
      'delivered': 4,
      'completed': 4,
      'returned': -1,
      'cancelled': -1
    };
    return statusMap[status] !== undefined ? statusMap[status] : -1;
  };

  const currentStageIndex = getStageIndex(orderStatus);

  // Calculate progress line width percentage
  const getProgressWidth = () => {
    if (currentStageIndex <= 0) return '0%';
    if (currentStageIndex >= stages.length - 1) return '100%';
    return `${(currentStageIndex / (stages.length - 1)) * 100}%`;
  };

  return (
    <div className="tracking-display-container">
      
      <div className="order-status-progress" style={{ '--progress-width': getProgressWidth() }}>
        {/* Progress line background */}
        <div className="progress-line-bg"></div>
        {/* Progress line filled */}
        <div className="progress-line-fill" style={{ width: getProgressWidth() }}></div>
        
        {stages.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isActive = index === currentStageIndex;
          const isPending = index > currentStageIndex;
          
          return (
            <div key={stage.key} className={`progress-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}>
              <div className="step-circle">
                <div className="step-icon">
                  {stage.icon}
                </div>
              </div>
              <div className="step-content">
                <div className="step-label">{stage.label}</div>
                <div className="step-description">{stage.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackingDisplay;