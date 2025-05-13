import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API_BASE_URL from '../../config';
import './Legal.css';

const DeletionStatus = () => {
  const { confirmationCode } = useParams();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/deletion-status/${confirmationCode}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch deletion status');
        }
        
        setStatus(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [confirmationCode]);

  if (loading) {
    return (
      <div className="deletion-status-container">
        <div className="deletion-status-content">
          <h1>Checking Deletion Status</h1>
          <p>Please wait while we check your deletion request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deletion-status-container">
        <div className="deletion-status-content">
          <h1>Error</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="deletion-status-container">
      <div className="deletion-status-content">
        <h1>Data Deletion Status</h1>
        <div className="status-info">
          <p>
            <strong>Status:</strong>{' '}
            <span className={`status-badge ${status.status}`}>
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </span>
          </p>
          <p>
            <strong>Request Date:</strong>{' '}
            {new Date(status.created_at).toLocaleString()}
          </p>
          {status.completed_at && (
            <p>
              <strong>Completion Date:</strong>{' '}
              {new Date(status.completed_at).toLocaleString()}
            </p>
          )}
        </div>
        {status.status === 'completed' && (
          <div className="success-message">
            <p>Your data has been successfully deleted from our systems.</p>
          </div>
        )}
        {status.status === 'pending' && (
          <div className="pending-message">
            <p>Your deletion request is being processed. Please check back later.</p>
          </div>
        )}
        {status.status === 'failed' && (
          <div className="error-message">
            <p>There was an error processing your deletion request. Please contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeletionStatus; 