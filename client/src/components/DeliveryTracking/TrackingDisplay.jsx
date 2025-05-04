import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TrackingDisplay.css';

const TrackingDisplay = ({ trackingId }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/delivery/tracking/${trackingId}`);
        setTrackingData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tracking data:', err);
        setError('Unable to load tracking information at this time.');
        setLoading(false);
      }
    };

    if (trackingId) {
      fetchTrackingData();
    }
  }, [trackingId]);

  if (loading) return <div className="tracking-loading">Loading tracking information...</div>;
  if (error) return <div className="tracking-error">{error}</div>;
  if (!trackingData) return <div className="tracking-unavailable">Tracking information not available yet.</div>;

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Picked Up, In Transit To Origin Hub':
        return 'Picked up';
      case 'Delivered, Collected by Customer':
      case 'Delivered, Left at Doorstep':
      case 'Delivered, Received by Customer':
        return 'Delivered';
      case 'Returned to Sender':
        return 'Returned';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return 'In Transit';
    }
  };

  return (
    <div className="tracking-container">
      <h3>Tracking Information</h3>
      <div className="tracking-number">
        <span className="label">Tracking Number:</span>
        <span className="value">{trackingId}</span>
      </div>
      
      <div className="tracking-status">
        <span className="label">Current Status:</span>
        <span className={`status-badge ${trackingData.currentStatus?.toLowerCase().replace(/\s/g, '-')}`}>
          {getStatusLabel(trackingData.currentStatus)}
        </span>
      </div>
      
      <div className="tracking-timeline">
        {trackingData.events && trackingData.events.map((event, index) => (
          <div key={index} className="timeline-item">
            <div className="timeline-date">
              {new Date(event.created_at).toLocaleDateString()} 
              {new Date(event.created_at).toLocaleTimeString()}
            </div>
            <div className="timeline-content">
              <div className="timeline-title">{getStatusLabel(event.status)}</div>
              <div className="timeline-description">{event.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackingDisplay; 