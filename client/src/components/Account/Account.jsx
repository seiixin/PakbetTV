import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import './Account.css';
import Footer from '../Footer';
import NavBar from '../NavBar';
import { notify } from '../../utils/notifications';

function Account() {
  const { user, isAuthenticated, loading: authLoading, refreshing } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
  });
  
  const [originalUserData, setOriginalUserData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
  });
  
  const [shippingAddress, setShippingAddress] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'PH',
    region: '',
    province: '',
    city_municipality: '',
    barangay: '',
    street_name: '',
    building: '',
    house_number: '',
  });
  
  const [originalAddress, setOriginalAddress] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'PH',
    region: '',
    province: '',
    city_municipality: '',
    barangay: '',
    street_name: '',
    building: '',
    house_number: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Initialize the userData state with user data from context
      const initialUserData = {
        username: user.username || '',
        firstname: user.firstName || '',
        lastname: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      };
      setUserData(initialUserData);
      setOriginalUserData(initialUserData);
      
      // Then fetch the complete profile
      fetchUserProfile();
    } else if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [user, isAuthenticated, authLoading, navigate]);
  
  const fetchUserProfile = async () => {
    try {
      const response = await authService.getProfile();
      const profileData = response.data;
      const userInfo = {
        username: profileData.username || user?.username || '',
        firstname: profileData.firstName || '',
        lastname: profileData.lastName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      };
      
      setUserData(userInfo);
      setOriginalUserData(userInfo);
      
      try {
        const shippingResponse = await authService.getShippingAddresses();
        const addresses = shippingResponse.data;
        if (addresses && addresses.length > 0) {
          const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
          const addressInfo = {
            address1: defaultAddress.address1 || '',
            address2: defaultAddress.address2 || '',
            city: defaultAddress.city || '',
            state: defaultAddress.state || '',
            postcode: defaultAddress.postcode || '',
            country: defaultAddress.country || 'PH',
            region: defaultAddress.region || '',
            province: defaultAddress.province || '',
            city_municipality: defaultAddress.city_municipality || '',
            barangay: defaultAddress.barangay || '',
            street_name: defaultAddress.street_name || '',
            building: defaultAddress.building || '',
            house_number: defaultAddress.house_number || '',
          };
          
          setShippingAddress(addressInfo);
          setOriginalAddress(addressInfo);
        }
      } catch (addressError) {
        console.error("Error fetching shipping addresses:", addressError);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalDetailsSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedProfile = {
        username: userData.username,
        firstName: userData.firstname,
        lastName: userData.lastname,
        email: userData.email,
        phone: userData.phone
      };
      
      await authService.updateProfile(updatedProfile);
      
      // Update the originalUserData to reflect the new values
      setOriginalUserData({...userData});
      setIsEditingPersonal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  
  const handleShippingDetailsSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const requiredFields = ['region', 'province', 'city_municipality', 'barangay', 'postcode'];
      const missingFields = requiredFields.filter(field => !shippingAddress[field]);
      
      if (missingFields.length > 0) {
        console.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }
      
      const addressToSave = {
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        city: shippingAddress.city_municipality,
        state: shippingAddress.province,
        city_municipality: shippingAddress.city_municipality,
        province: shippingAddress.province,
        postcode: shippingAddress.postcode,
        country: shippingAddress.country || 'PH',
        region: shippingAddress.region,
        barangay: shippingAddress.barangay,
        street_name: shippingAddress.street_name,
        building: shippingAddress.building,
        house_number: shippingAddress.house_number,
        is_default: true
      };
      
      await authService.addShippingAddress(addressToSave);
      setIsEditingShipping(false);
      setOriginalAddress({...shippingAddress});
      await fetchUserProfile();
    } catch (error) {
      console.error('Error updating shipping address:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const togglePersonalEdit = () => {
    if (isEditingPersonal) {
      setUserData({...originalUserData});
    }
    setIsEditingPersonal(!isEditingPersonal);
  };
  
  const toggleShippingEdit = () => {
    if (isEditingShipping) {
      setShippingAddress({...originalAddress});
    }
    setIsEditingShipping(!isEditingShipping);
  };
  
  const cancelPersonalEdit = () => {
    setUserData({...originalUserData});
    setIsEditingPersonal(false);
  };
  
  const cancelShippingEdit = () => {
    setShippingAddress({...originalAddress});
    setIsEditingShipping(false);
  };

  const handleNameChange = (e) => {
    const nameParts = e.target.value.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    setUserData(prev => ({
      ...prev,
      firstname: firstName,
      lastname: lastName
    }));
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      notify.error('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      notify.error('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await authService.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      setIsEditingPassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (error) {
      // Error notification is already handled in authService.updatePassword
      console.error('Error updating password:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSpinnerStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(128, 0, 0, 0.1)',
    borderTop: '2px solid #800000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    zIndex: 9999
  };

  if (loading || authLoading) {
    return (
      <div className="account-page">
        <NavBar />
        <div className="account-loading-container">
          <div className="account-loading-spinner"></div>
          <p>Loading your account information...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const fullName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
  
  const displayCity = shippingAddress.city_municipality || shippingAddress.city || '';
  const displayState = shippingAddress.province || shippingAddress.state || '';
  
  const formattedAddress = [
    shippingAddress.address1,
    shippingAddress.address2,
    displayCity,
    displayState,
    shippingAddress.postcode,
    shippingAddress.country === 'PH' ? 'Philippines' : 
    shippingAddress.country === 'SG' ? 'Singapore' : 
    shippingAddress.country === 'US' ? 'United States' : 
    shippingAddress.country === 'CA' ? 'Canada' :
    shippingAddress.country === 'GB' ? 'United Kingdom' :
    shippingAddress.country === 'AU' ? 'Australia' :
    shippingAddress.country
  ].filter(Boolean).join(', ');

  return (
    <div className="account-background account-page">
      {refreshing && (
        <>
          <div style={refreshSpinnerStyle}></div>
          <style>
            {`
              @keyframes account-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </>
      )}
      <NavBar />
      <div className="account-content">
        <main className="account-container" role="main" aria-label="My Account">
          <section className="account-column" aria-labelledby="personal-details-title">
            <div className="account-section-header-container">
              <h2 id="personal-details-title" className="account-section-header">Personal Details</h2>
              {!isEditingPersonal && (
                <button 
                  type="button" 
                  className="account-edit-button" 
                  onClick={togglePersonalEdit}
                >
                  Edit
                </button>
              )}
            </div>
            
            {isEditingPersonal ? (
              <form onSubmit={handlePersonalDetailsSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input 
                    type="text" 
                    id="username" 
                    name="username" 
                    value={userData.username} 
                    onChange={(e) => setUserData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fullname">Full Name</label>
                  <input 
                    type="text" 
                    id="fullname" 
                    name="fullname" 
                    value={fullName}
                    onChange={handleNameChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={userData.email} 
                    onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={userData.phone} 
                    onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="account-form-actions">
                  <button type="button" className="account-cancel-button" onClick={cancelPersonalEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="account-save-button">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="account-info-display">
                <div>
                  <p className="account-info-label">Username</p>
                  <p className="account-info-value">{userData.username || 'Not set'}</p>
                </div>
                
                <div>
                  <p className="account-info-label">Full Name</p>
                  <p className="account-info-value">{fullName || 'Not set'}</p>
                </div>
                
                <div>
                  <p className="account-info-label">Email Address</p>
                  <p className="account-info-value">{userData.email || 'Not set'}</p>
                </div>
                
                <div>
                  <p className="account-info-label">Phone Number</p>
                  <p className="account-info-value">{userData.phone || 'Not set'}</p>
                </div>
              </div>
            )}
          </section>
          
          <section className="account-column" aria-labelledby="password-details-title">
            <div className="account-section-header-container">
              <h2 id="password-details-title" className="account-section-header">Password Settings</h2>
              {!isEditingPassword && (
                <button 
                  type="button" 
                  className="account-edit-button" 
                  onClick={() => setIsEditingPassword(true)}
                >
                  Change Password
                </button>
              )}
            </div>
            
            {isEditingPassword ? (
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input 
                    type="password" 
                    id="currentPassword" 
                    name="currentPassword" 
                    value={passwordForm.currentPassword} 
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input 
                    type="password" 
                    id="newPassword" 
                    name="newPassword" 
                    value={passwordForm.newPassword} 
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmNewPassword">Confirm New Password</label>
                  <input 
                    type="password" 
                    id="confirmNewPassword" 
                    name="confirmNewPassword" 
                    value={passwordForm.confirmNewPassword} 
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="account-form-actions">
                  <button type="button" className="account-cancel-button" onClick={() => {
                    setIsEditingPassword(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmNewPassword: ''
                    });
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="account-save-button">
                    Update Password
                  </button>
                </div>
              </form>
            ) : (
              <div className="account-info-display">
                <div>
                  <p className="account-info-label">Password</p>
                  <p className="account-info-value">••••••••</p>
                </div>
              </div>
            )}
          </section>
          
          <section className="account-column" aria-labelledby="shipping-details-title">
            <div className="account-section-header-container">
              <h2 id="shipping-details-title" className="account-section-header">Shipping Details</h2>
              {!isEditingShipping && (
                <button 
                  type="button" 
                  className="account-edit-button" 
                  onClick={toggleShippingEdit}
                >
                  Edit
                </button>
              )}
            </div>
            
            {isEditingShipping ? (
              <form 
                id="shipping-details-form" 
                aria-describedby="shipping-details-desc" 
                autoComplete="on" 
                noValidate
                onSubmit={handleShippingDetailsSubmit}
              >
                <p id="shipping-details-desc">
                  Manage your delivery address details. Fields marked with * are required.
                </p>
                
                <label htmlFor="region">Region *</label>
                <input 
                  type="text" 
                  id="region" 
                  name="region" 
                  placeholder="Region" 
                  required 
                  value={shippingAddress.region || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, region: e.target.value }))}
                />

                <label htmlFor="province">Province *</label>
                <input 
                  type="text" 
                  id="province" 
                  name="province" 
                  placeholder="Province" 
                  required 
                  value={shippingAddress.province || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, province: e.target.value }))}
                />

                <label htmlFor="city_municipality">City/Municipality *</label>
                <input 
                  type="text" 
                  id="city_municipality" 
                  name="city_municipality" 
                  placeholder="City/Municipality" 
                  required 
                  value={shippingAddress.city_municipality || ''}
                  onChange={(e) => setShippingAddress(prev => ({ 
                    ...prev, 
                    city_municipality: e.target.value,
                    city: e.target.value
                  }))}
                />

                <label htmlFor="barangay">Barangay *</label>
                <input 
                  type="text" 
                  id="barangay" 
                  name="barangay" 
                  placeholder="Barangay" 
                  required 
                  value={shippingAddress.barangay || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, barangay: e.target.value }))}
                />

                <label htmlFor="street_name">Street Name</label>
                <input 
                  type="text" 
                  id="street_name" 
                  name="street_name" 
                  placeholder="Street Name" 
                  value={shippingAddress.street_name || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, street_name: e.target.value }))}
                />

                <label htmlFor="house_number">House Number</label>
                <input 
                  type="text" 
                  id="house_number" 
                  name="house_number" 
                  placeholder="House Number" 
                  value={shippingAddress.house_number || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, house_number: e.target.value }))}
                />

                <label htmlFor="building">Building/Floor/Unit (optional)</label>
                <input 
                  type="text" 
                  id="building" 
                  name="building" 
                  placeholder="Building, Floor, Unit number" 
                  value={shippingAddress.building || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, building: e.target.value }))}
                />

                <label htmlFor="postcode">Postal Code *</label>
                <input 
                  type="text" 
                  id="postcode" 
                  name="postcode" 
                  placeholder="Postal Code" 
                  required 
                  value={shippingAddress.postcode || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, postcode: e.target.value }))}
                />

                <label htmlFor="country">Country</label>
                <select 
                  id="country" 
                  name="country" 
                  required 
                  value={shippingAddress.country || 'PH'}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))}
                >
                  <option value="PH">Philippines</option>
                  <option value="SG">Singapore</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="MY">Malaysia</option>
                </select>

                <div className="account-form-actions">
                  <button type="button" className="account-cancel-button" onClick={cancelShippingEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="account-save-button">
                    Save Shipping Details
                  </button>
                </div>
              </form>
            ) : (
              <div className="account-info-display">
                <p className="account-info-label">Address</p>
                <p className="account-info-value">
                  {formattedAddress || 'No shipping address has been set yet'}
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
      <Footer forceShow={false} />
    </div>
  );
}

export default Account;