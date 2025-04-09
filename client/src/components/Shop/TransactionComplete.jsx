import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Shop.css';

const TransactionComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  
  useEffect(() => {
    const verifyTransaction = async (txnId, refNo, status) => {
      try {
        // Make API call to verify transaction status
        const response = await fetch(`http://localhost:5000/api/transactions/verify?txnId=${txnId}&refNo=${refNo}`);
        
        if (response.ok) {
          const data = await response.json();
          setOrderDetails(data.order);
          
          // If backend verification returns a different status, use that instead
          if (data.status && data.status !== status) {
            setStatus(data.status);
            setMessage(data.message || '');
          }
        } else {
          console.error('Failed to verify transaction');
        }
      } catch (error) {
        console.error('Error verifying transaction:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Get parameters from URL
    const params = new URLSearchParams(location.search);
    const txnId = params.get('txnId');
    const refNo = params.get('refNo');
    const status = params.get('status');
    const message = params.get('message');
    
    console.log('Transaction parameters:', { txnId, refNo, status, message });
    
    // Set initial status based on parameters
    if (status) {
      setStatus(status);
      setMessage(message || '');
      
      // Verify transaction with backend
      if (txnId) {
        verifyTransaction(txnId, refNo, status);
      } else {
        setLoading(false);
      }
    } else {
      setStatus('unknown');
      setMessage('No transaction status information available');
      setLoading(false);
    }
  }, [location]);
  
  const handleContinueShopping = () => {
    navigate('/shop');
  };
  
  const handleViewOrders = () => {
    navigate('/purchases');
  };
  
  if (loading) {
    return (
      <div className="transaction-complete loading">
        <div className="loading-spinner">Processing your transaction...</div>
      </div>
    );
  }
  
  // Determine if transaction was successful
  // Success status could be 'S' or 'PS' (success or pending success)
  const isSuccess = status === 'S' || status === 'PS' || status === 'paid';
  
  return (
    <div className={`transaction-complete ${isSuccess ? 'success' : 'failed'}`}>
      <div className="transaction-status-icon">
        {isSuccess ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
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
        {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
      </h1>
      
      <p className="transaction-message">
        {message || (isSuccess 
          ? 'Your payment has been processed successfully. Thank you for your purchase!' 
          : 'There was an issue processing your payment. Please try again or contact customer support.')}
      </p>
      
      {orderDetails && (
        <div className="order-details">
          <h3>Order #{orderDetails.id}</h3>
          <p>Total: ₱{parseFloat(orderDetails.total_amount).toFixed(2)}</p>
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
  );
};

export default TransactionComplete; 