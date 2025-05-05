import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import './Account.css';
import Footer from '../Footer';
import NavBar from '../NavBar';

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
  
  // Keep track of original data to restore on cancel
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
  
  // Keep track of original address to restore on cancel
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
  
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch user profile and shipping info on component mount
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isAuthenticated && user) {
      fetchUserProfile();
    }
  }, [user, isAuthenticated, authLoading, navigate]);
  
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authService.getProfile();
      console.log("Profile data received:", response.data);
      
      const profileData = response.data;
      const userInfo = {
        username: profileData.username || '',
        firstname: profileData.firstName || '',
        lastname: profileData.lastName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      };
      
      setUserData(userInfo);
      setOriginalUserData(userInfo);
      
      try {
        const shippingResponse = await authService.getShippingAddresses();
        console.log("Shipping addresses received:", shippingResponse.data);
        
        const addresses = shippingResponse.data;
        if (addresses && addresses.length > 0) {
          const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
          console.log("Using default address:", defaultAddress);
          
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
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalDetailsSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const updatedProfile = {
        firstName: userData.firstname,
        lastName: userData.lastname,
        email: userData.email,
        phone: userData.phone
      };
      
      await authService.updateProfile(updatedProfile);
      setSuccess('Personal details updated successfully');
      setIsEditingPersonal(false);
      
      // Update original data after successful save
      setOriginalUserData({...userData});
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update personal details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShippingDetailsSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Format shipping address for API using the format from the server response
      const addressToSave = {
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        city_municipality: shippingAddress.city_municipality || shippingAddress.city,
        province: shippingAddress.province || shippingAddress.state,
        postcode: shippingAddress.postcode,
        country: shippingAddress.country,
        region: shippingAddress.region,
        barangay: shippingAddress.barangay,
        street_name: shippingAddress.street_name,
        building: shippingAddress.building,
        house_number: shippingAddress.house_number,
        is_default: true
      };
      
      await authService.addShippingAddress(addressToSave);
      setSuccess('Shipping details updated successfully');
      setIsEditingShipping(false);
      
      // Update original address after successful save
      setOriginalAddress({...shippingAddress});
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating shipping address:', error);
      setError(error.response?.data?.message || 'Failed to update shipping details');
    } finally {
      setLoading(false);
    }
  };
  
  const togglePersonalEdit = () => {
    if (isEditingPersonal) {
      // If canceling edit, restore original data
      setUserData({...originalUserData});
    }
    setIsEditingPersonal(!isEditingPersonal);
  };
  
  const toggleShippingEdit = () => {
    if (isEditingShipping) {
      // If canceling edit, restore original data
      setShippingAddress({...originalAddress});
    }
    setIsEditingShipping(!isEditingShipping);
  };
  
  const cancelPersonalEdit = () => {
    // Reset to original values
    setUserData({...originalUserData});
    setIsEditingPersonal(false);
  };
  
  const cancelShippingEdit = () => {
    // Reset to original values
    setShippingAddress({...originalAddress});
    setIsEditingShipping(false);
  };

  // Handler for name input
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

  // Subtle loading spinner for auth refreshing
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
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your account information...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Combine first and last name for the full name field
  const fullName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
  
  // For the shipping address display, using city_municipality or city
  const displayCity = shippingAddress.city_municipality || shippingAddress.city || '';
  const displayState = shippingAddress.province || shippingAddress.state || '';
  
  // Display address for view mode
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
    <div className="account-page">
      {refreshing && (
        <>
          <div style={refreshSpinnerStyle}></div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </>
      )}
      <NavBar />
      <main className="container" role="main" aria-label="My Account">
        <section className="column" aria-labelledby="personal-details-title">
          <div className="section-header-container">
            <h2 id="personal-details-title" className="section-header">Personal Details</h2>
            {!isEditingPersonal && (
              <button 
                type="button" 
                className="edit-button" 
                onClick={togglePersonalEdit}
              >
                Edit
              </button>
            )}
          </div>
          
          {isEditingPersonal ? (
            // Edit mode - Form
            <form 
              id="personal-details-form" 
              aria-describedby="personal-details-desc" 
              autoComplete="on" 
              noValidate
              onSubmit={handlePersonalDetailsSubmit}
            >
              <p id="personal-details-desc">
                Update your name, email, and contact details here.
              </p>
              
              <label htmlFor="fullname">Full Name</label>
              <input 
                type="text" 
                id="fullname" 
                name="fullname" 
                placeholder="John Doe" 
                required 
                autoComplete="name"
                value={fullName}
                onChange={handleNameChange}
              />

              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="john@example.com" 
                required 
                autoComplete="email"
                value={userData.email || ''}
                onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
              />

              <label htmlFor="phone">Phone Number</label>
              <input 
                type="tel" 
                id="phone" 
                name="phone" 
                placeholder="+1 555 123 4567" 
                autoComplete="tel" 
                pattern="[+0-9\s\-]{7,}"
                value={userData.phone || ''}
                onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
              />

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={cancelPersonalEdit}>
                  Cancel
                </button>
                <button type="submit" className="save-button">
                  Save Personal Details
                </button>
              </div>
            </form>
          ) : (
            // View mode - Display only
            <div className="info-display">
              <p className="info-label">Full Name</p>
              <p className="info-value">{fullName || 'Not set'}</p>
              
              <p className="info-label">Email Address</p>
              <p className="info-value">{userData.email || 'Not set'}</p>
              
              <p className="info-label">Phone Number</p>
              <p className="info-value">{userData.phone || 'Not set'}</p>
            </div>
          )}
        </section>
        
        <section className="column" aria-labelledby="shipping-details-title">
          <div className="section-header-container">
            <h2 id="shipping-details-title" className="section-header">Shipping Details</h2>
            {!isEditingShipping && (
              <button 
                type="button" 
                className="edit-button" 
                onClick={toggleShippingEdit}
              >
                Edit
              </button>
            )}
          </div>
          
          {isEditingShipping ? (
            // Edit mode - Form
            <form 
              id="shipping-details-form" 
              aria-describedby="shipping-details-desc" 
              autoComplete="on" 
              noValidate
              onSubmit={handleShippingDetailsSubmit}
            >
              <p id="shipping-details-desc">
                Manage your delivery address details.
              </p>
              
              <label htmlFor="address1">Street Address</label>
              <input 
                type="text" 
                id="address1" 
                name="address1" 
                placeholder="1234 Main St" 
                required 
                autoComplete="address-line1"
                value={shippingAddress.address1 || ''}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, address1: e.target.value }))}
              />

              <label htmlFor="address2">Apartment, suite, etc. (optional)</label>
              <input 
                type="text" 
                id="address2" 
                name="address2" 
                placeholder="Apartment or suite" 
                autoComplete="address-line2"
                value={shippingAddress.address2 || ''}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
              />

              <label htmlFor="city">City</label>
              <input 
                type="text" 
                id="city" 
                name="city" 
                placeholder="New York" 
                required 
                autoComplete="address-level2"
                value={displayCity}
                onChange={(e) => setShippingAddress(prev => ({ 
                  ...prev, 
                  city: e.target.value,
                  city_municipality: e.target.value
                }))}
              />

              <label htmlFor="state">State / Province</label>
              <input 
                type="text" 
                id="state" 
                name="state" 
                placeholder="NY" 
                required 
                autoComplete="address-level1"
                value={displayState}
                onChange={(e) => setShippingAddress(prev => ({ 
                  ...prev, 
                  state: e.target.value,
                  province: e.target.value
                }))}
              />

              <label htmlFor="zipcode">Zip / Postal Code</label>
              <input 
                type="text" 
                id="zipcode" 
                name="zipcode" 
                placeholder="10001" 
                required 
                autoComplete="postal-code"
                value={shippingAddress.postcode || ''}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, postcode: e.target.value }))}
              />

              <label htmlFor="country">Country</label>
              <select 
                id="country" 
                name="country" 
                required 
                autoComplete="country"
                value={shippingAddress.country || 'PH'}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))}
              >
                <option value="" disabled>Select your country</option>
                <option value="PH">Philippines</option>
                <option value="SG">Singapore</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="MY">Malaysia</option>
              </select>

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={cancelShippingEdit}>
                  Cancel
                </button>
                <button type="submit" className="save-button">
                  Save Shipping Details
                </button>
              </div>
            </form>
          ) : (
            // View mode - Display only
            <div className="info-display">
              <p className="info-label">Address</p>
              <p className="info-value">
                {formattedAddress || 'No shipping address has been set yet'}
              </p>
            </div>
          )}
        </section>
      </main>
      
      {error && <div className="error-message" role="alert">{error}</div>}
      {success && <div className="success-message" role="status">{success}</div>}
      
      <Footer />
    </div>
  );
}

export default Account; 