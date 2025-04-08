import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        firstname: user.firstname || '',
        middlename: user.middlename || '',
        lastname: user.lastname || '',
        email: user.email || ''
      });
    }
  }, [user, isAuthenticated, navigate]);

  return (
    <div className="account-container">
      <div className="account-wrapper">
        <h1 className="account-title">My Account</h1>
        
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