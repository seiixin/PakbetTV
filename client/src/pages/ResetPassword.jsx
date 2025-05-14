import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './ResetPassword.css';
import { BASE_URL } from '../config';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/auth/verify-reset-token/${token}`);
        setIsValidToken(true);
      } catch (error) {
        toast.error('Invalid or expired reset token');
        navigate('/login');
      }
    };
    verifyToken();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/auth/reset-password/${token}`, {
        password
      });
      toast.success('Password has been reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return <div className="verifying-token">Verifying token...</div>;
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h2>Reset Password</h2>
        <p className="reset-password-description">
          Please enter your new password below.
        </p>
        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="reset-password-form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter new password"
              minLength="8"
            />
          </div>
          <div className="reset-password-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              minLength="8"
            />
          </div>
          <button 
            type="submit" 
            className="reset-password-button"
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword; 