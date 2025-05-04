import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
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
  
  const [shippingAddress, setShippingAddress] = useState({
    address1: '',
    address2: '',
    area: '',
    city: '',
    state: '',
    postcode: '',
    country: 'MY',
    address_type: 'home',
    is_default: true
  });
  
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user) {
      setUserData({
        username: user.username || '',
        firstname: user.first_name || user.firstname || '',
        middlename: user.middle_name || user.middlename || '',
        lastname: user.last_name || user.lastname || '',
        email: user.email || ''
      });
      
      // Fetch user's shipping address
      fetchShippingAddress();
    }
  }, [user, isAuthenticated, navigate]);
  
  const fetchShippingAddress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('/api/users/shipping-addresses', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.data && response.data.length > 0) {
        // Get the default address or the first one
        const defaultAddress = response.data.find(addr => addr.is_default) || response.data[0];
        setShippingAddress({
          address1: defaultAddress.address1 || '',
          address2: defaultAddress.address2 || '',
          area: defaultAddress.area || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          postcode: defaultAddress.postcode || '',
          country: defaultAddress.country || 'MY',
          address_type: defaultAddress.address_type || 'home',
          is_default: defaultAddress.is_default || true
        });
      }
    } catch (error) {
      console.error('Error fetching shipping address:', error);
    }
  };
  
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressLoading(true);
    setAddressError('');
    setAddressSuccess('');
    
    // Validate required fields
    if (!shippingAddress.address1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postcode) {
      setAddressError('Address, city, state, and postcode are required');
      setAddressLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAddressError('You must be logged in');
        setAddressLoading(false);
        return;
      }
      
      await axios.post('/api/users/shipping-address', shippingAddress, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });
      
      setAddressSuccess('Shipping address updated successfully');
      setIsEditingAddress(false);
      setAddressLoading(false);
      
      // Refresh shipping address data
      fetchShippingAddress();
      
    } catch (error) {
      console.error('Error saving shipping address:', error);
      setAddressError(error.response?.data?.message || 'Failed to update shipping address');
      setAddressLoading(false);
    }
  };

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
          {/* Personal Information Section */}
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
          
          {/* Shipping Address Section */}
          <div className="account-section">
            <div className="section-header">
              <h2>Shipping Address</h2>
              {!isEditingAddress && (
                <button 
                  className="edit-button"
                  onClick={() => setIsEditingAddress(true)}
                >
                  {shippingAddress.address1 ? 'Edit Address' : 'Add Address'}
                </button>
              )}
            </div>
            
            {addressSuccess && (
              <div className="success-message">{addressSuccess}</div>
            )}
            {addressError && (
              <div className="error-message">{addressError}</div>
            )}
            
            {isEditingAddress ? (
              <form className="address-form" onSubmit={handleAddressSubmit}>
                <div className="form-group">
                  <label htmlFor="address1">Address Line 1*</label>
                  <input
                    type="text"
                    id="address1"
                    name="address1"
                    value={shippingAddress.address1}
                    onChange={handleAddressChange}
                    placeholder="Street address, house number"
                    required
                    disabled={addressLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="address2">Address Line 2</label>
                  <input
                    type="text"
                    id="address2"
                    name="address2"
                    value={shippingAddress.address2}
                    onChange={handleAddressChange}
                    placeholder="Apartment, suite, unit, building (optional)"
                    disabled={addressLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="area">Area/District/Barangay*</label>
                  <input
                    type="text"
                    id="area"
                    name="area"
                    value={shippingAddress.area}
                    onChange={handleAddressChange}
                    placeholder="Area, district, or barangay"
                    required
                    disabled={addressLoading}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group half">
                    <label htmlFor="city">City*</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleAddressChange}
                      placeholder="City"
                      required
                      disabled={addressLoading}
                    />
                  </div>
                  
                  <div className="form-group half">
                    <label htmlFor="state">State/Province*</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleAddressChange}
                      placeholder="State or province"
                      required
                      disabled={addressLoading}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group half">
                    <label htmlFor="postcode">Postal Code*</label>
                    <input
                      type="text"
                      id="postcode"
                      name="postcode"
                      value={shippingAddress.postcode}
                      onChange={handleAddressChange}
                      placeholder="Postal code"
                      required
                      disabled={addressLoading}
                    />
                  </div>
                  
                  <div className="form-group half">
                    <label htmlFor="country">Country</label>
                    <select
                      id="country"
                      name="country"
                      value={shippingAddress.country}
                      onChange={handleAddressChange}
                      disabled={addressLoading}
                    >
                      <option value="MY">Malaysia</option>
                      <option value="PH">Philippines</option>
                      <option value="SG">Singapore</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group half">
                    <label htmlFor="address_type">Address Type</label>
                    <select
                      id="address_type"
                      name="address_type"
                      value={shippingAddress.address_type}
                      onChange={handleAddressChange}
                      disabled={addressLoading}
                    >
                      <option value="home">Home</option>
                      <option value="office">Office</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="form-group half checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={shippingAddress.is_default}
                        onChange={(e) => setShippingAddress(prev => ({
                          ...prev,
                          is_default: e.target.checked
                        }))}
                        disabled={addressLoading}
                      /> 
                      Set as default address
                    </label>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => {
                      setIsEditingAddress(false);
                      fetchShippingAddress(); // Reset to original values
                    }}
                    disabled={addressLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-button"
                    disabled={addressLoading}
                  >
                    {addressLoading ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="address-display">
                {shippingAddress.address1 ? (
                  <>
                    <div className="info-row">
                      <p className="info-label">Address:</p>
                      <p className="info-value">
                        {shippingAddress.address1}
                        {shippingAddress.address2 && <span><br />{shippingAddress.address2}</span>}
                      </p>
                    </div>
                    <div className="info-row">
                      <p className="info-label">Area:</p>
                      <p className="info-value">{shippingAddress.area}</p>
                    </div>
                    <div className="info-row">
                      <p className="info-label">City:</p>
                      <p className="info-value">{shippingAddress.city}</p>
                    </div>
                    <div className="info-row">
                      <p className="info-label">State:</p>
                      <p className="info-value">{shippingAddress.state}</p>
                    </div>
                    <div className="info-row">
                      <p className="info-label">Postal Code:</p>
                      <p className="info-value">{shippingAddress.postcode}</p>
                    </div>
                    <div className="info-row">
                      <p className="info-label">Country:</p>
                      <p className="info-value">
                        {shippingAddress.country === 'MY' ? 'Malaysia' : 
                         shippingAddress.country === 'PH' ? 'Philippines' : 
                         shippingAddress.country === 'SG' ? 'Singapore' : 
                         shippingAddress.country}
                      </p>
                    </div>
                    <div className="info-row">
                      <p className="info-label">Address Type:</p>
                      <p className="info-value">
                        {shippingAddress.address_type === 'home' ? 'Home' :
                         shippingAddress.address_type === 'office' ? 'Office' :
                         'Other'}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="no-address-message">No shipping address found. Please add your shipping address to ensure smooth delivery of your orders.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account; 