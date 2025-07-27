import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import SocialLogin from './SocialLogin';
import LegalModal from '../common/LegalModal';
import './Auth.css';

function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    symbol: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update password requirements if password field is being changed
    if (name === 'password') {
      checkPasswordRequirements(value);
    }
  };

  const checkPasswordRequirements = (password) => {
    setPasswordRequirements({
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[@$!%*?&]/.test(password)
    });
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.username || !formData.email) {
          toast.error('Please fill in username and email');
          return false;
        }
        if (!formData.email.includes('@')) {
          toast.error('Please enter a valid email address');
          return false;
        }
        break;
      case 2:
        if (!formData.firstname || !formData.lastname) {
          toast.error('Please fill in first and last name');
          return false;
        }
        break;
      case 3:
        if (!formData.password || !formData.confirmPassword) {
          toast.error('Please fill in both password fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return false;
        }
        
        // Check all password requirements
        const { length, lowercase, uppercase, number, symbol } = passwordRequirements;
        if (!length) {
          toast.error('Password must be at least 8 characters long');
          return false;
        }
        if (!lowercase) {
          toast.error('Password must contain at least one lowercase letter');
          return false;
        }
        if (!uppercase) {
          toast.error('Password must contain at least one uppercase letter');
          return false;
        }
        if (!number) {
          toast.error('Password must contain at least one number');
          return false;
        }
        if (!symbol) {
          toast.error('Password must contain at least one symbol (@$!%*?&)');
          return false;
        }
        break;
      default:
        return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!validateStep(3)) {
      setLoading(false);
      return;
    }
    
    const userData = {
      username: formData.username,
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      password: formData.password
    };
    
    const result = await register(userData);
    if (result.success) {
      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/login');
    } else {
      toast.error(result.message || 'Registration failed');
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Create Account';
      case 2:
        return 'Personal Info';
      case 3:
        return 'Set Password';
      default:
        return 'Create Account';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return 'Enter your username and email';
      case 2:
        return 'Tell us your name';
      case 3:
        return 'Choose a secure password';
      default:
        return 'Sign up for a new account';
    }
  };

  const closeLegalModal = () => {
    setShowPrivacyPolicy(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-row two-columns">
            <div className="form-group">
              <label htmlFor="username">Username*</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email*</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="form-row two-columns">
            <div className="form-group">
              <label htmlFor="firstname">First Name*</label>
              <input
                type="text"
                id="firstname"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                placeholder="First name"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastname">Last Name*</label>
              <input
                type="text"
                id="lastname"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                placeholder="Last name"
                required
                disabled={loading}
              />
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="form-row password-step">
            <div className="form-group">
              <label htmlFor="password">Password*</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password')}
                  className="password-toggle-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Requirements Indicator */}
              <div className="password-requirements">
                <p className="requirements-title">Password must contain:</p>
                <ul className="requirements-list">
                  <li className={passwordRequirements.length ? 'requirement-met' : 'requirement-unmet'}>
                    <span className="requirement-icon">
                      {passwordRequirements.length ? '✓' : '○'}
                    </span>
                    At least 8 characters
                  </li>
                  <li className={passwordRequirements.lowercase ? 'requirement-met' : 'requirement-unmet'}>
                    <span className="requirement-icon">
                      {passwordRequirements.lowercase ? '✓' : '○'}
                    </span>
                    One lowercase letter (a-z)
                  </li>
                  <li className={passwordRequirements.uppercase ? 'requirement-met' : 'requirement-unmet'}>
                    <span className="requirement-icon">
                      {passwordRequirements.uppercase ? '✓' : '○'}
                    </span>
                    One uppercase letter (A-Z)
                  </li>
                  <li className={passwordRequirements.number ? 'requirement-met' : 'requirement-unmet'}>
                    <span className="requirement-icon">
                      {passwordRequirements.number ? '✓' : '○'}
                    </span>
                    One number (0-9)
                  </li>
                  <li className={passwordRequirements.symbol ? 'requirement-met' : 'requirement-unmet'}>
                    <span className="requirement-icon">
                      {passwordRequirements.symbol ? '✓' : '○'}
                    </span>
                    One symbol (@$!%*?&)
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password*</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="password-toggle-btn"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="password-match-indicator">
                  {formData.password === formData.confirmPassword ? (
                    <p className="password-match-success">
                      <span className="requirement-icon">✓</span>
                      Passwords match
                    </p>
                  ) : (
                    <p className="password-match-error">
                      <span className="requirement-icon">×</span>
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form signup" onSubmit={currentStep === 3 ? handleSubmit : (e) => e.preventDefault()}>
        <div className="auth-back-button">
          <Link to="/" className="back-to-home-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <polyline points="12,19 5,12 12,5"></polyline>
            </svg>
          </Link>
        </div>
        
        <div className="auth-header">
          <h2>{getStepTitle()}</h2>
          <p>{getStepDescription()}</p>
        </div>
        
        {renderStepContent()}
        
        {/* Show privacy policy agreement in all steps */}
        <p className="privacy-agreement">
          By signing up, you agree to our{' '}
          <span 
            className="privacy-policy-link"
            onClick={() => setShowPrivacyPolicy(true)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setShowPrivacyPolicy(true);
              }
            }}
          >
            Privacy Policy
          </span>
          .
        </p>
        
        <div className="step-navigation">
          {currentStep > 1 && (
            <button 
              type="button" 
              className="auth-button secondary"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </button>
          )}
          
          {currentStep < 3 ? (
            <button 
              type="button" 
              className="auth-button"
              onClick={handleContinue}
              disabled={loading}
            >
              Continue
            </button>
          ) : (
            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
          )}
        </div>
        
        <SocialLogin />
        
        <div className="auth-redirect">
          Already have an account?
          <Link to="/login">Log In</Link>
        </div>
      </form>

      <LegalModal 
        isOpen={showPrivacyPolicy} 
        onClose={closeLegalModal} 
        type="privacy" 
      />
    </div>
  );
}

export default Signup; 