import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import './Account.css';
import Footer from '../Footer';
import NavBar from '../NavBar';
import { notify } from '../../utils/notifications';
import ConfirmationModal from '../common/ConfirmationModal';

function Account() {
  const { user, isAuthenticated, loading: authLoading, refreshing, logout } = useAuth();
  const navigate = useNavigate();
  
  // All useState hooks grouped together
  const [userData, setUserData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
  });
  
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
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
    region_id: '',
    province: '',
    province_id: '',
    city_municipality: '',
    city_id: '',
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [checkingDeleteStatus, setCheckingDeleteStatus] = useState(true);

  // Location data fetching functions
  const fetchRegions = async () => {
    try {
      setLoadingLocations(true);
      const response = await authService.getRegions();
      if (response.data) {
        setRegions(response.data);
        // If we have an existing region_id, pre-fetch provinces
        if (shippingAddress.region_id) {
          await fetchProvinces(shippingAddress.region_id);
        }
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
      notify.error('Failed to load regions');
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchProvinces = async (regionId) => {
    if (!regionId) return;
    try {
      setLoadingLocations(true);
      const response = await authService.getProvinces(regionId);
      if (response.data) {
        setProvinces(response.data);
        // If we have an existing province_id, pre-fetch cities
        if (shippingAddress.province_id) {
          await fetchCities(shippingAddress.province_id);
        }
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
      notify.error('Failed to load provinces');
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchCities = async (provinceId) => {
    if (!provinceId) return;
    try {
      setLoadingLocations(true);
      const response = await authService.getCities(provinceId);
      if (response.data) {
        setCities(response.data);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      notify.error('Failed to load cities');
    } finally {
      setLoadingLocations(false);
    }
  };

  // Location change handlers
  const handleRegionChange = (e) => {
    const selectedRegion = regions.find(r => r.region_id === Number(e.target.value));
    setShippingAddress(prev => ({
      ...prev,
      region_id: selectedRegion?.region_id || '',
      region: selectedRegion?.region_name || '',
      province: '',
      province_id: '',
      city_municipality: '',
      city_id: ''
    }));
    setProvinces([]);
    setCities([]);
    if (selectedRegion?.region_id) {
      fetchProvinces(selectedRegion.region_id);
    }
  };

  const handleProvinceChange = (e) => {
    const selectedProvince = provinces.find(p => p.province_id === Number(e.target.value));
    setShippingAddress(prev => ({
      ...prev,
      province_id: selectedProvince?.province_id || '',
      province: selectedProvince?.province_name || '',
      city_municipality: '',
      city_id: ''
    }));
    setCities([]);
    if (selectedProvince?.province_id) {
      fetchCities(selectedProvince.province_id);
    }
  };

  const handleCityChange = (e) => {
    const selectedCity = cities.find(c => c.city_id === Number(e.target.value));
    setShippingAddress(prev => ({
      ...prev,
      city_id: selectedCity?.city_id || '',
      city_municipality: selectedCity?.city_name || ''
    }));
  };

  // All useEffect hooks grouped together
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const initialUserData = {
        username: user.username || '',
        firstname: user.firstName || '',
        lastname: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      };
      setUserData(initialUserData);
      setOriginalUserData(initialUserData);
      fetchUserProfile();
      checkCanDelete();
    } else if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [user, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchRegions();
    }
  }, [isAuthenticated, authLoading]);

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
            region_id: defaultAddress.region_id || '',
            province: defaultAddress.province || '',
            province_id: defaultAddress.province_id || '',
            city_municipality: defaultAddress.city_municipality || '',
            city_id: defaultAddress.city_id || '',
            barangay: defaultAddress.barangay || '',
            street_name: defaultAddress.street_name || '',
            building: defaultAddress.building || '',
            house_number: defaultAddress.house_number || '',
          };
          
          setShippingAddress(addressInfo);
          setOriginalAddress(addressInfo);
          
          // Pre-fetch location data if we have region_id
          if (defaultAddress.region_id) {
            await fetchRegions();
            if (defaultAddress.province_id) {
              await fetchProvinces(defaultAddress.region_id);
              if (defaultAddress.city_id) {
                await fetchCities(defaultAddress.province_id);
              }
            }
          }
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
      setIsSaving(true);
      
      const requiredFields = ['region_id', 'province_id', 'city_id', 'barangay', 'postcode'];
      const missingFields = requiredFields.filter(field => !shippingAddress[field]);
      
      if (missingFields.length > 0) {
        notify.error(`Please fill in all required fields: ${missingFields.map(field => field.replace('_id', '')).join(', ')}`);
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
        region_id: shippingAddress.region_id,
        province_id: shippingAddress.province_id,
        city_id: shippingAddress.city_id,
        barangay: shippingAddress.barangay,
        street_name: shippingAddress.street_name,
        building: shippingAddress.building,
        house_number: shippingAddress.house_number,
        is_default: true
      };
      
      await authService.addShippingAddress(addressToSave);
      setOriginalAddress({...shippingAddress});
      notify.success('Shipping address updated successfully');
      await fetchUserProfile();
      setIsEditingShipping(false);
    } catch (error) {
      console.error('Error updating shipping address:', error);
      notify.error('Failed to update shipping address');
    } finally {
      setIsSaving(false);
    }
  };
  
  const togglePersonalEdit = () => {
    if (isEditingPersonal) {
      setUserData({...originalUserData});
    }
    setIsEditingPersonal(!isEditingPersonal);
  };
  
  const toggleShippingEdit = async () => {
    if (isEditingShipping) {
      setShippingAddress({...originalAddress});
      setProvinces([]);
      setCities([]);
    } else {
      try {
        setLoadingLocations(true);
        // First fetch regions
        const regionsResponse = await authService.getRegions();
        setRegions(regionsResponse.data || []);
        
        // If we have a region_id, fetch provinces
        if (shippingAddress.region_id) {
          const provincesResponse = await authService.getProvinces(shippingAddress.region_id);
          setProvinces(provincesResponse.data || []);
          
          // If we have a province_id, fetch cities
          if (shippingAddress.province_id) {
            const citiesResponse = await authService.getCities(shippingAddress.province_id);
            setCities(citiesResponse.data || []);
          }
        }
      } catch (error) {
        console.error('Error loading location data:', error);
        notify.error('Failed to load location data');
      } finally {
        setLoadingLocations(false);
      }
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

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await authService.deleteAccount();
      notify.success('Account deleted successfully');
      // First logout the user
      await logout();
      // Then navigate to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete account. Please try again later.';
      notify.error(errorMessage);
      // Close the modal only if there's an error
      setShowDeleteConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const checkCanDelete = async () => {
    try {
      setCheckingDeleteStatus(true);
      const response = await authService.canDeleteAccount();
      setCanDelete(response.canDelete);
    } catch (error) {
      console.error('Error checking delete status:', error);
      // Default to false if there's an error
      setCanDelete(false);
    } finally {
      setCheckingDeleteStatus(false);
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

  // Hero Component (same as horoscope page)
  const Hero = () => {
    return (
      <section className="blog-hero" role="banner" tabIndex="0">
        <div className="blog-hero-text">
          Account Management
        </div>
        <p>Manage your account settings and view your information</p>
      </section>
    );
  };

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
        <Hero />
        
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
                <p id="shipping-details-desc" className={loadingLocations ? 'loading-text' : ''}>
                  Manage your delivery address details. Fields marked with * are required.
                  {loadingLocations && ' Loading location data...'}
                </p>
                
                <div className="form-group">
                  <label htmlFor="region">
                    Region * 
                    <span className="current-value">
                      {shippingAddress.region ? ` (Current: ${shippingAddress.region})` : ''}
                    </span>
                  </label>
                  <select 
                    id="region" 
                    name="region" 
                    required 
                    value={shippingAddress.region_id || ''}
                    onChange={handleRegionChange}
                    disabled={isSaving || loadingLocations}
                    className={loadingLocations ? 'loading' : ''}
                  >
                    <option value="">
                      {loadingLocations ? 'Loading regions...' : 'Select region'}
                    </option>
                    {regions.map(region => (
                      <option key={region.region_id} value={region.region_id}>
                        {region.region_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="province">
                    Province * 
                    <span className="current-value">
                      {shippingAddress.province ? ` (Current: ${shippingAddress.province})` : ''}
                    </span>
                  </label>
                  <select 
                    id="province" 
                    name="province" 
                    required 
                    value={shippingAddress.province_id || ''}
                    onChange={handleProvinceChange}
                    disabled={isSaving || loadingLocations || !shippingAddress.region_id}
                    className={loadingLocations ? 'loading' : ''}
                  >
                    <option value="">
                      {loadingLocations ? 'Loading provinces...' : 
                       !shippingAddress.region_id ? 'Please select a region first' : 
                       'Select province'}
                    </option>
                    {provinces.map(province => (
                      <option key={province.province_id} value={province.province_id}>
                        {province.province_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="city_municipality">
                    City/Municipality * 
                    <span className="current-value">
                      {shippingAddress.city_municipality ? ` (Current: ${shippingAddress.city_municipality})` : ''}
                    </span>
                  </label>
                  <select 
                    id="city_municipality" 
                    name="city_municipality" 
                    required 
                    value={shippingAddress.city_id || ''}
                    onChange={handleCityChange}
                    disabled={isSaving || loadingLocations || !shippingAddress.province_id}
                    className={loadingLocations ? 'loading' : ''}
                  >
                    <option value="">
                      {loadingLocations ? 'Loading cities...' : 
                       !shippingAddress.province_id ? 'Please select a province first' : 
                       'Select city/municipality'}
                    </option>
                    {cities.map(city => (
                      <option key={city.city_id} value={city.city_id}>
                        {city.city_name}
                      </option>
                    ))}
                  </select>
                </div>

                <label htmlFor="barangay">Barangay *</label>
                <input 
                  type="text" 
                  id="barangay" 
                  name="barangay" 
                  placeholder="Barangay" 
                  required 
                  value={shippingAddress.barangay || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, barangay: e.target.value }))}
                  disabled={isSaving}
                />

                <label htmlFor="street_name">Street Name</label>
                <input 
                  type="text" 
                  id="street_name" 
                  name="street_name" 
                  placeholder="Street Name" 
                  value={shippingAddress.street_name || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, street_name: e.target.value }))}
                  disabled={isSaving}
                />

                <label htmlFor="house_number">House Number</label>
                <input 
                  type="text" 
                  id="house_number" 
                  name="house_number" 
                  placeholder="House Number" 
                  value={shippingAddress.house_number || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, house_number: e.target.value }))}
                  disabled={isSaving}
                />

                <label htmlFor="building">Building/Floor/Unit (optional)</label>
                <input 
                  type="text" 
                  id="building" 
                  name="building" 
                  placeholder="Building, Floor, Unit number" 
                  value={shippingAddress.building || ''}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, building: e.target.value }))}
                  disabled={isSaving}
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
                  disabled={isSaving}
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
                  <button 
                    type="button" 
                    className="account-cancel-button" 
                    onClick={cancelShippingEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="account-save-button"
                    disabled={isSaving || loadingLocations}
                  >
                    {isSaving ? 'Saving...' : 'Save Shipping Details'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="account-info-display">
                <div>
                  <p className="account-info-label">Region</p>
                  <p className="account-info-value">{shippingAddress.region || 'Not set'}</p>
                </div>
                <div>
                  <p className="account-info-label">Province</p>
                  <p className="account-info-value">{shippingAddress.province || 'Not set'}</p>
                </div>
                <div>
                  <p className="account-info-label">City/Municipality</p>
                  <p className="account-info-value">{shippingAddress.city_municipality || 'Not set'}</p>
                </div>
                <div>
                  <p className="account-info-label">Barangay</p>
                  <p className="account-info-value">{shippingAddress.barangay || 'Not set'}</p>
                </div>
                <div>
                  <p className="account-info-label">Street Address</p>
                  <p className="account-info-value">
                    {[
                      shippingAddress.house_number,
                      shippingAddress.building,
                      shippingAddress.street_name
                    ].filter(Boolean).join(', ') || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="account-info-label">Postal Code</p>
                  <p className="account-info-value">{shippingAddress.postcode || 'Not set'}</p>
                </div>
              </div>
            )}
          </section>

          <section className="account-column" aria-labelledby="danger-zone-title">
            <div className="account-section-header-container">
              <h2 id="danger-zone-title" className="account-section-header">Danger Zone</h2>
            </div>
            <div className="account-danger-zone">
              <p className="account-danger-text">
                Once you delete your account, there is no going back. Please be certain.
                {!canDelete && !checkingDeleteStatus && (
                  <span className="account-warning-text">
                    <br />You cannot delete your account while you have active orders.
                  </span>
                )}
              </p>
              <button 
                type="button" 
                className="account-delete-button"
                onClick={() => setShowDeleteConfirmation(true)}
                disabled={!canDelete || checkingDeleteStatus}
              >
                {checkingDeleteStatus ? 'Checking...' : 'Delete Account'}
              </button>
            </div>
          </section>
        </main>
      </div>

      {showDeleteConfirmation && (
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Are you sure you want to delete your account? This action cannot be undone."
          confirmText={loading ? "Deleting..." : "Yes, Delete My Account"}
          cancelText="Cancel"
          confirmButtonClass="danger"
          loading={loading}
        />
      )}

      <Footer forceShow={false} />
    </div>
  );
}

export default Account;