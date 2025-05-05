import React from 'react';
import './TrackingDisplay.css';
import { FaBoxOpen, FaShippingFast, FaBox, FaTruck, FaCheckCircle } from 'react-icons/fa';

const TrackingDisplay = ({ trackingData, orderStatus }) => {
  if (!trackingData && !orderStatus) {
    return <div className="tracking-unavailable">Tracking information not available yet.</div>;
  }

  // Define the stages for the order tracking
  const stages = [
    { key: 'processing', label: 'Processing', icon: <FaBoxOpen size={24} /> },
    { key: 'for_packing', label: 'Packing', icon: <FaBox size={24} /> },
    { key: 'shipped', label: 'Shipped', icon: <FaShippingFast size={24} /> },
    { key: 'picked_up', label: 'Delivery', icon: <FaTruck size={24} /> },
    { key: 'completed', label: 'Completed', icon: <FaCheckCircle size={24} /> }
  ];

  // Map the order status to the tracking stages
  const getStageIndex = (status) => {
    const statusMap = {
      'pending_payment': -1,
      'processing': 0,
      'for_packing': 1,
      'packed': 1,
      'for_shipping': 2,
      'shipped': 2,
      'picked_up': 3,
      'delivered': 4,
      'completed': 4,
      'returned': -1,
      'cancelled': -1
    };
    return statusMap[status] !== undefined ? statusMap[status] : -1;
  };

  const currentStageIndex = getStageIndex(orderStatus);

  return (
    <div className="tracking-display-container">
      <h3 className="tracking-title">Order Status</h3>
      
      <div className="tracking-stages">
        {stages.map((stage, index) => {
          const isActive = index <= currentStageIndex;
          const isCurrentStage = index === currentStageIndex;
          
          return (
            <div 
              key={stage.key} 
              className={`tracking-stage ${isActive ? 'active' : ''} ${isCurrentStage ? 'current' : ''}`}
            >
              <div className="stage-icon-container">
                <div className="stage-icon">
                  {stage.icon}
                </div>
                {index < stages.length - 1 && (
                  <div className={`stage-line ${isActive ? 'active' : ''}`}></div>
                )}
              </div>
              <div className="stage-label">{stage.label}</div>
            </div>
          );
        })}
      </div>
      
      {trackingData && trackingData.events && trackingData.events.length > 0 && (
        <div className="tracking-events">
          <h4>Tracking Updates</h4>
          <div className="tracking-timeline">
            {trackingData.events.map((event, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-date">
                  {new Date(event.created_at).toLocaleDateString()} 
                  {new Date(event.created_at).toLocaleTimeString()}
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">{event.status}</div>
                  <div className="timeline-description">{event.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingDisplay; 