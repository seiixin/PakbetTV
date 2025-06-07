import React, { useState } from 'react';
import { FaTimes, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import ninjaVanService from '../../services/ninjaVanService';
import { orderService } from '../../services/api';
import { notify } from '../../utils/notifications';
import './CancelOrderModal.css';

const CancelOrderModal = ({ 
  isOpen, 
  onClose, 
  order, 
  onOrderCancelled 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('confirm'); // 'confirm', 'processing', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !order) return null;

  const canCancelOrder = ninjaVanService.canCancelOrder(order.order_status);
  const cancellationMessage = ninjaVanService.getCancellationMessage(order.order_status);

  const handleCancelOrder = async () => {
    if (!order.tracking_number) {
      setErrorMessage('No tracking number found for this order. Please contact support.');
      setStep('error');
      return;
    }

    setIsLoading(true);
    setStep('processing');

    try {
      // Use the order service to cancel the order
      const response = await orderService.cancelOrder(order.tracking_number);
      
      setStep('success');
      
      // Notify parent component that order was cancelled
      if (onOrderCancelled) {
        onOrderCancelled(order.order_id, response.data);
      }
      
      notify.success('Order cancelled successfully! Your refund will be processed within 3-5 business days.');
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset modal state
        setTimeout(() => {
          setStep('confirm');
          setErrorMessage('');
          setIsLoading(false);
        }, 300);
      }, 2000);

    } catch (error) {
      console.error('Error cancelling order:', error);
      setErrorMessage(error.message || 'Failed to cancel order. Please try again or contact support.');
      setStep('error');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      // Reset modal state after close animation
      setTimeout(() => {
        setStep('confirm');
        setErrorMessage('');
        setIsLoading(false);
      }, 300);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'confirm':
        return (
          <>
            <div className="cancel-modal-header">
              <div className="cancel-modal-icon warning">
                <FaExclamationTriangle />
              </div>
              <h3>Cancel Order</h3>
              <button 
                className="cancel-modal-close" 
                onClick={handleClose}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>

            <div className="cancel-modal-content">
              <div className="cancel-order-details">
                <div className="cancel-detail-row">
                  <span className="cancel-detail-label">Order ID:</span>
                  <span className="cancel-detail-value">{order.order_code || order.order_id}</span>
                </div>
                <div className="cancel-detail-row">
                  <span className="cancel-detail-label">Tracking Number:</span>
                  <span className="cancel-detail-value">{order.tracking_number || 'Not assigned yet'}</span>
                </div>
                <div className="cancel-detail-row">
                  <span className="cancel-detail-label">Total Amount:</span>
                  <span className="cancel-detail-value">₱{parseFloat(order.total_price || 0).toFixed(2)}</span>
                </div>
                <div className="cancel-detail-row">
                  <span className="cancel-detail-label">Status:</span>
                  <span className="cancel-detail-value status">{order.order_status}</span>
                </div>
              </div>

              {canCancelOrder ? (
                <div className="cancel-warning">
                  <p><strong>Are you sure you want to cancel this order?</strong></p>
                  <p>{cancellationMessage}</p>
                  <div className="cancel-refund-info">
                    <FaExclamationTriangle className="info-icon" />
                    <span>Your refund will be processed within 3-5 business days after cancellation.</span>
                  </div>
                </div>
              ) : (
                <div className="cancel-not-allowed">
                  <p><strong>This order cannot be cancelled.</strong></p>
                  <p>{cancellationMessage}</p>
                </div>
              )}
            </div>

            <div className="cancel-modal-actions">
              <button 
                className="cancel-modal-btn secondary" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Keep Order
              </button>
              {canCancelOrder && (
                <button 
                  className="cancel-modal-btn danger" 
                  onClick={handleCancelOrder}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="spinner" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              )}
            </div>
          </>
        );

      case 'processing':
        return (
          <div className="cancel-modal-processing">
            <div className="cancel-modal-header">
              <h3>Cancelling Order...</h3>
            </div>
            <div className="cancel-modal-content">
              <div className="cancel-processing-animation">
                <FaSpinner className="large-spinner" />
                <p>Please wait while we cancel your order...</p>
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="cancel-modal-success">
            <div className="cancel-modal-header">
              <div className="cancel-modal-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3>Order Cancelled Successfully</h3>
            </div>
            <div className="cancel-modal-content">
              <p>Your order has been cancelled and your refund is being processed.</p>
              <div className="cancel-success-details">
                <p><strong>What happens next:</strong></p>
                <ul>
                  <li>You will receive a confirmation email shortly</li>
                  <li>Your refund will be processed within 3-5 business days</li>
                  <li>The refund will be credited to your original payment method</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <>
            <div className="cancel-modal-header">
              <div className="cancel-modal-icon error">
                <FaTimes />
              </div>
              <h3>Cancellation Failed</h3>
              <button 
                className="cancel-modal-close" 
                onClick={handleClose}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>
            <div className="cancel-modal-content">
              <div className="cancel-error-message">
                <p>{errorMessage}</p>
              </div>
            </div>
            <div className="cancel-modal-actions">
              <button 
                className="cancel-modal-btn secondary" 
                onClick={handleClose}
              >
                Close
              </button>
              <button 
                className="cancel-modal-btn primary" 
                onClick={() => setStep('confirm')}
              >
                Try Again
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="cancel-modal-overlay" onClick={handleClose}>
      <div 
        className="cancel-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
      >
        {renderStep()}
      </div>
    </div>
  );
};

export default CancelOrderModal; 