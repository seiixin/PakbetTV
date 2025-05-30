import React, { useState, useEffect } from 'react';
import './AddressForm.css';

const AddressForm = ({ onChange, initialAddress = {} }) => {
  const [address, setAddress] = useState({
    address1: '',
    address2: '',
    area: '',
    city: '',
    state: '',
    postcode: '',
    country: 'PH',
    address_type: 'home',
    ...initialAddress
  });

  const [errors, setErrors] = useState({});

  const philippineProvinces = [
    'Abra',
    'Agusan del Norte',
    'Agusan del Sur',
    'Aklan',
    'Albay',
    'Antique',
    'Apayao',
    'Aurora',
    'Bataan',
    'Batanes',
    'Batangas',
    'Benguet',
    'Bohol',
    'Bukidnon',
    'Bulacan',
    'Cagayan',
    'Camarines Norte',
    'Camarines Sur',
    'Camiguin',
    'Capiz',
    'Catanduanes',
    'Cavite',
    'Cebu',
    'Davao de Oro',
    'Davao del Norte',
    'Davao del Sur',
    'Davao Occidental',
    'Eastern Samar',
    'Guimaras',
    'Ifugao',
    'Ilocos Norte',
    'Ilocos Sur',
    'Iloilo',
    'Isabela',
    'Kalinga',
    'La Union',
    'Laguna',
    'Leyte',
    'Maguindanao',
    'Marinduque',
    'Masbate',
    'Metro Manila',
    'Misamis Occidental',
    'Misamis Oriental',
    'Mountain Province',
    'Negros Occidental',
    'Negros Oriental',
    'Northern Samar',
    'Nueva Ecija',
    'Nueva Vizcaya',
    'Occidental Mindoro',
    'Oriental Mindoro',
    'Palawan',
    'Pampanga',
    'Pangasinan',
    'Quezon',
    'Quirino',
    'Rizal',
    'Romblon',
    'Samar',
    'Sarangani',
    'Siquijor',
    'Sorsogon',
    'South Cotabato',
    'Southern Leyte',
    'Sultan Kudarat',
    'Surigao del Norte',
    'Surigao del Sur',
    'Tarlac',
    'Tawi-Tawi',
    'Zambales',
    'Zamboanga del Norte',
    'Zamboanga del Sur',
    'Zamboanga Sibugay'
  ];

  const malaysianStates = [
    'Johor',
    'Kedah',
    'Kelantan',
    'Melaka',
    'Negeri Sembilan',
    'Pahang',
    'Perak',
    'Perlis',
    'Pulau Pinang',
    'Sabah',
    'Sarawak',
    'Selangor',
    'Terengganu',
    'Kuala Lumpur',
    'Labuan',
    'Putrajaya'
  ];

  useEffect(() => {
    if (typeof initialAddress === 'string') {
      // Try to parse from string format
      const parts = initialAddress.split(',').map(part => part.trim());
      const newAddress = { ...address };
      
      if (parts.length > 0) newAddress.address1 = parts[0];
      if (parts.length > 1) newAddress.area = parts[1];
      if (parts.length > 2) newAddress.city = parts[parts.length - 2];
      if (parts.length > 3) newAddress.state = parts[parts.length - 1];
      
      // Extract postcode if present
      const postcodeMatch = initialAddress.match(/\d{5,6}/);
      if (postcodeMatch) {
        newAddress.postcode = postcodeMatch[0];
      }
      
      setAddress(newAddress);
    } else if (typeof initialAddress === 'object') {
      setAddress({
        address1: '',
        address2: '',
        area: '',
        city: '',
        state: '',
        postcode: '',
        country: 'PH',
        address_type: 'home',
        ...initialAddress
      });
    }
  }, [initialAddress]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Call parent onChange handler with updated address
    onChange({
      ...address,
      [name]: value
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!address.address1.trim()) {
      newErrors.address1 = 'Address line 1 is required';
    }
    
    if (!address.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!address.state) {
      newErrors.state = 'Province is required';
    }
    
    if (!address.postcode.trim()) {
      newErrors.postcode = 'Postal code is required';
    } else if (!/^\d{4,6}$/.test(address.postcode.trim())) {
      newErrors.postcode = 'Enter a valid postal code';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate address when submitting the form
  useEffect(() => {
    if (onChange) {
      const isValid = validateForm();
      onChange(address, isValid);
    }
  }, [address]);

  // Get appropriate state/province list based on country
  const getStateOptions = () => {
    if (address.country === 'MY') {
      return malaysianStates;
    }
    return philippineProvinces;
  };

  // Get label for state/province based on country
  const getStateLabel = () => {
    return address.country === 'MY' ? 'State' : 'Province';
  };

  return (
    <div className="address-form">
      <div className="form-group">
        <label htmlFor="address1">Address Line 1 *</label>
        <input
          type="text"
          id="address1"
          name="address1"
          value={address.address1}
          onChange={handleChange}
          placeholder="House/Unit number and street name"
          className={errors.address1 ? 'error' : ''}
        />
        {errors.address1 && <span className="error-text">{errors.address1}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="address2">Address Line 2</label>
        <input
          type="text"
          id="address2"
          name="address2"
          value={address.address2}
          onChange={handleChange}
          placeholder="Apartment, suite, unit, building, floor, etc."
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="area">Area/Barangay</label>
        <input
          type="text"
          id="area"
          name="area"
          value={address.area}
          onChange={handleChange}
          placeholder="Neighborhood, barangay or area name"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group half">
          <label htmlFor="city">City/Municipality *</label>
          <input
            type="text"
            id="city"
            name="city"
            value={address.city}
            onChange={handleChange}
            placeholder="City or municipality"
            className={errors.city ? 'error' : ''}
          />
          {errors.city && <span className="error-text">{errors.city}</span>}
        </div>
        
        <div className="form-group half">
          <label htmlFor="postcode">Postal/ZIP Code *</label>
          <input
            type="text"
            id="postcode"
            name="postcode"
            value={address.postcode}
            onChange={handleChange}
            placeholder={address.country === 'PH' ? 'e.g. 1000' : 'e.g. 50000'}
            className={errors.postcode ? 'error' : ''}
            maxLength={6}
          />
          {errors.postcode && <span className="error-text">{errors.postcode}</span>}
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="country">Country *</label>
        <select
          id="country"
          name="country"
          value={address.country}
          onChange={handleChange}
        >
          <option value="PH">Philippines</option>
          <option value="MY">Malaysia</option>
          <option value="SG">Singapore</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="state">{getStateLabel()} *</label>
        <select
          id="state"
          name="state"
          value={address.state}
          onChange={handleChange}
          className={errors.state ? 'error' : ''}
        >
          <option value="">Select {getStateLabel()}</option>
          {getStateOptions().map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        {errors.state && <span className="error-text">{errors.state}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="address_type">Address Type</label>
        <select
          id="address_type"
          name="address_type"
          value={address.address_type}
          onChange={handleChange}
        >
          <option value="home">Home</option>
          <option value="work">Work</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
};

export default AddressForm; 