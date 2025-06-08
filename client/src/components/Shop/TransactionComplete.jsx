import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './TransactionComplete.css';
import API_BASE_URL from '../../config';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/cookies';

const TransactionComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyTransaction = async (txnId, refNo, status) => {
      try {
        console.log('Verifying transaction:', { txnId, refNo, status });
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/transactions/verify?txnId=${txnId}&refNo=${refNo}&status=${status}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to verify transaction');
        }

        const data = await response.json();
        console.log('Verification response:', data);

        setOrderDetails(data.order);
        if (data.status) {
          setStatus(data.status);
          setMessage(data.message || '');
        }
      } catch (error) {
        console.error('Error verifying transaction:', error);
        setError(error.message);
      }
    };

    const params = new URLSearchParams(location.search);
    // Handle both URL patterns from DragonPay
    const txnId = params.get('txnId') || params.get('txnid');
    const refNo = params.get('refNo') || params.get('refno');
    const status = params.get('status') || 'S'; // Default to success if not provided
    const message = decodeURIComponent(params.get('message') || '');

    console.log('Transaction parameters:', { txnId, refNo, status, message });

    if (txnId && refNo) {
      verifyTransaction(txnId, refNo, status);
      setStatus(status);
      setMessage(message || '');
    } else {
      setStatus('unknown');
      setMessage('Missing transaction information');
    }
  }, [location.search]);

  const handleContinueShopping = () => {
    navigate('/shop', { replace: true });
  };

  const handleViewOrders = () => {
    navigate('/purchases', { replace: true });
  };

  if (loading) {
    return (
      <div className="transaction-complete-container">
        <div className="transaction-complete">
          <div className="loading-spinner">Verifying your transaction...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transaction-complete-container">
        <div className="transaction-complete failed">
          <div className="transaction-status-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h1 className="transaction-title">Transaction Error</h1>
          <p className="transaction-message">{error}</p>
          <div className="transaction-actions">
            <button className="secondary-button" onClick={handleContinueShopping}>
              Return to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = status === 'S' || status === 'success' || status === 'paid';
  const isPending = status === 'P' || status === 'pending';

  return (
    <div className="transaction-complete-container">
      <div className={`transaction-complete ${isSuccess ? 'success' : isPending ? 'pending' : 'failed'}`}>
        <div className="transaction-status-icon">
          {isSuccess ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : isPending ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          )}
        </div>
        <h1 className="transaction-title">
          {isSuccess ? 'Payment Successful!' : isPending ? 'Payment Pending' : 'Payment Failed'}
        </h1>
        <p className="transaction-message">
          {message || (isSuccess 
            ? 'Your payment has been processed successfully. Thank you for your purchase!' 
            : isPending
            ? 'Your payment is being processed. We will update your order status once the payment is confirmed.'
            : 'There was an issue processing your payment. Please try again or contact customer support.')}
        </p>
        
        {orderDetails && (
          <div className="order-details">
            <h3>Order #{orderDetails.order_code || orderDetails.order_id}</h3>
            <p>Total: ₱{parseFloat(orderDetails.total_price || orderDetails.total_amount || 0).toFixed(2)}</p>
            {orderDetails.tracking_number && (
              <p>Tracking Number: {orderDetails.tracking_number}</p>
            )}
          </div>
        )}
        
        <div className="transaction-actions">
          <button 
            className="secondary-button"
            onClick={handleContinueShopping}
          >
            Continue Shopping
          </button>
          {isSuccess && (
            <button 
              className="primary-button"
              onClick={handleViewOrders}
            >
              View My Orders
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionComplete; 