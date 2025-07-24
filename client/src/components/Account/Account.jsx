import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import './Account.css';
import Footer from '../Footer';
import NavBar from '../NavBar';
import { notify } from '../../utils/notifications';
import ConfirmationModal from '../common/ConfirmationModal';
import AddressForm from '../Checkout/AddressForm';

function Account() {
  const { user, isAuthenticated, loading: authLoading, refreshing, logout } = useAuth();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
  });
  
  const [originalUserData, setOriginalUserData] = useState({ ...userData });
  
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
  
  const [originalAddress, setOriginalAddress] = useState({ ...shippingAddress });
  
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
  const [isAddressFormValid, setIsAddressFormValid] = useState(false);

  const handleAddressChange = useCallback((updatedAddress, isValid) => {
    setShippingAddress(updatedAddress);
    setIsAddressFormValid(isValid);
  }, []);

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
      setIsSaving(true);
      const updatedProfile = {
        username: userData.username,
        firstName: userData.firstname,
        lastName: userData.lastname,
        email: userData.email,
        phone: userData.phone
      };
      
      await authService.updateProfile(updatedProfile);
      
      setOriginalUserData({...userData});
      setIsEditingPersonal(false);
      notify.success('Personal details updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      notify.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleShippingDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!isAddressFormValid) {
      notify.error('Please fill in all required address fields correctly.');
      return;
    }

    try {
      setIsSaving(true);
      const addressToSave = {
        ...shippingAddress,
        is_default: true,
      };
      
      await authService.addShippingAddress(addressToSave);
      setOriginalAddress({ ...shippingAddress });
      notify.success('Shipping address updated successfully');
      await fetchUserProfile();
      setIsEditingShipping(false);
    } catch (error) {
      console.error('Error updating shipping address:', error);
      notify.error(error.response?.data?.message || 'Failed to update shipping address');
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
      notify.success('Password updated successfully');
    } catch (error) {
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
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete account. Please try again later.';
      notify.error(errorMessage);
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
      setCanDelete(false);
    } finally {
      setCheckingDeleteStatus(false);
    }
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
      {refreshing && <div className="refresh-spinner"></div>}
      <NavBar />
      <div className="account-content">
        <Hero />
        
        <main className="account-container" role="main" aria-label="My Account">
          {/* Personal Details Section */}
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
                  <input type="text" id="username" name="username" value={userData.username} onChange={(e) => setUserData(prev => ({ ...prev, username: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="fullname">Full Name</label>
                  <input type="text" id="fullname" name="fullname" value={fullName} onChange={handleNameChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" name="email" value={userData.email} onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div className="account-form-actions">
                  <button type="button" className="account-cancel-button" onClick={cancelPersonalEdit} disabled={isSaving}>Cancel</button>
                  <button type="submit" className="account-save-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            ) : (
              <div className="account-info-display">
                <div><p className="account-info-label">Username</p><p className="account-info-value">{userData.username || 'Not set'}</p></div>
                <div><p className="account-info-label">Full Name</p><p className="account-info-value">{fullName || 'Not set'}</p></div>
                <div><p className="account-info-label">Email Address</p><p className="account-info-value">{userData.email || 'Not set'}</p></div>
              </div>
            )}
          </section>
          
          {/* Password Settings Section */}
          <section className="account-column" aria-labelledby="password-details-title">
            <div className="account-section-header-container">
              <h2 id="password-details-title" className="account-section-header">Password Settings</h2>
              {!isEditingPassword && <button type="button" className="account-edit-button" onClick={() => setIsEditingPassword(true)}>Change Password</button>}
            </div>
            
            {isEditingPassword ? (
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group"><label htmlFor="currentPassword">Current Password</label><input type="password" id="currentPassword" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordChange} required /></div>
                <div className="form-group"><label htmlFor="newPassword">New Password</label><input type="password" id="newPassword" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange} required /></div>
                <div className="form-group"><label htmlFor="confirmNewPassword">Confirm New Password</label><input type="password" id="confirmNewPassword" name="confirmNewPassword" value={passwordForm.confirmNewPassword} onChange={handlePasswordChange} required /></div>
                <div className="account-form-actions">
                  <button type="button" className="account-cancel-button" onClick={() => { setIsEditingPassword(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); }}>Cancel</button>
                  <button type="submit" className="account-save-button" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
                </div>
              </form>
            ) : (
              <div className="account-info-display">
                <div><p className="account-info-label">Password</p><p className="account-info-value">••••••••</p></div>
              </div>
            )}
          </section>
          
          {/* Shipping Details Section */}
          <section className="account-column" aria-labelledby="shipping-details-title">
            <div className="account-section-header-container">
              <h2 id="shipping-details-title" className="account-section-header">Shipping Details</h2>
              {!isEditingShipping && <button type="button" className="account-edit-button" onClick={toggleShippingEdit}>Edit</button>}
            </div>
            
            {isEditingShipping ? (
              <form onSubmit={handleShippingDetailsSubmit}>
                <AddressForm 
                  initialAddress={originalAddress}
                  onChange={handleAddressChange}
                  disabled={isSaving}
                />
                <div className="account-form-actions">
                  <button type="button" className="account-cancel-button" onClick={cancelShippingEdit} disabled={isSaving}>Cancel</button>
                  <button type="submit" className="account-save-button" disabled={isSaving || !isAddressFormValid}>{isSaving ? 'Saving...' : 'Save Shipping Details'}</button>
                </div>
              </form>
            ) : (
              <div className="account-info-display">
                <div><p className="account-info-label">Region</p><p className="account-info-value">{shippingAddress.region || 'Not set'}</p></div>
                <div><p className="account-info-label">Province</p><p className="account-info-value">{displayState || 'Not set'}</p></div>
                <div><p className="account-info-label">City/Municipality</p><p className="account-info-value">{displayCity || 'Not set'}</p></div>
                <div><p className="account-info-label">Barangay</p><p className="account-info-value">{shippingAddress.barangay || 'Not set'}</p></div>
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
                <div><p className="account-info-label">Postal Code</p><p className="account-info-value">{shippingAddress.postcode || 'Not set'}</p></div>
              </div>
            )}
          </section>

          {/* Danger Zone Section */}
          <section className="account-column" aria-labelledby="danger-zone-title">
            <div className="account-section-header-container">
              <h2 id="danger-zone-title" className="account-section-header">Danger Zone</h2>
            </div>
            <div className="account-danger-zone">
              <p className="account-danger-text">
                Once you delete your account, there is no going back. Please be certain.
                {!canDelete && !checkingDeleteStatus && <span className="account-warning-text"><br />You cannot delete your account while you have active orders.</span>}
              </p>
              <button type="button" className="account-delete-button" onClick={() => setShowDeleteConfirmation(true)} disabled={!canDelete || checkingDeleteStatus}>
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