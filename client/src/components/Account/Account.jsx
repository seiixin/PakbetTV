import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Account.css';

function Account() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    username: '',
    firstname: '',
    middlename: '',
    lastname: '',
    email: ''
  });

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Set user data if authenticated
    if (user) {
      setUserData({
        username: user.username || '',
        firstname: user.first_name || user.firstname || '',
        middlename: user.middle_name || user.middlename || '',
        lastname: user.last_name || user.lastname || '',
        email: user.email || ''
      });
    }
  }, [user, isAuthenticated, navigate]);

  return (
    <div className="account-container">
      <div className="account-wrapper">
        <h1 className="account-title">My Account</h1>
        
        <div className="account-navigation">
          <Link to="/account" className="account-nav-item active">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </Link>
          <Link to="/account/purchases" className="account-nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            Purchases
          </Link>
          <Link to="/cart" className="account-nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Cart
          </Link>
        </div>
        
        <div className="account-info">
          <div className="account-section">
            <h2>Personal Information</h2>
            <div className="info-row">
              <p className="info-label">Username:</p>
              <p className="info-value">{userData.username}</p>
            </div>
            <div className="info-row">
              <p className="info-label">First Name:</p>
              <p className="info-value">{userData.firstname}</p>
            </div>
            {userData.middlename && (
              <div className="info-row">
                <p className="info-label">Middle Name:</p>
                <p className="info-value">{userData.middlename}</p>
              </div>
            )}
            <div className="info-row">
              <p className="info-label">Last Name:</p>
              <p className="info-value">{userData.lastname}</p>
            </div>
            <div className="info-row">
              <p className="info-label">Email:</p>
              <p className="info-value">{userData.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account; 