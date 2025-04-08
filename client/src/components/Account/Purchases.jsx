import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Account.css';

function Purchases() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="account-container">
      <div className="account-wrapper">
        <h1 className="account-title">My Purchases</h1>
        
        <div className="purchases-section">
          <div className="empty-purchases">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <h3>No purchases yet</h3>
            <p>You haven't made any purchases yet. Browse our shop to find something you like!</p>
            <button className="shop-now-btn" onClick={() => navigate('/shop')}>
              Shop Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Purchases; 