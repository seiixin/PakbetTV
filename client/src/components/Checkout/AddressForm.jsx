import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../../services/api';
import './AddressForm.css';

// Debounce hook for performance optimization
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const AddressForm = ({ onChange, initialAddress = {}, disabled = false }) => {
  // Address state
  const [address, setAddress] = useState({
    house_number: '',
    building: '',
    street_name: '',
    barangay: '',
    city_municipality: '',
    province: '',
    region: '',
    postcode: '',
    address_type: 'home',
    ...initialAddress
  });

  // PSGC data state
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  
  // Loading states
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  
  // Selected PSGC IDs
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedBarangayId, setSelectedBarangayId] = useState('');

  // Validation state
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);
  const [errorRegions, setErrorRegions] = useState(null);

  // NCR district handling
  const [isNCR, setIsNCR] = useState(false);

  // Serviceability checking state
  const [serviceabilityStatus, setServiceabilityStatus] = useState(null); // null, 'checking', 'serviceable', 'not-serviceable', 'error'
  const [serviceabilityMessage, setServiceabilityMessage] = useState('');

  // Debounced values for API calls to improve performance
  const debouncedRegionId = useDebounce(selectedRegionId, 300);
  const debouncedProvinceId = useDebounce(selectedProvinceId, 300);
  const debouncedCityId = useDebounce(selectedCityId, 300);

  // Memoized complete address for serviceability checking
  const completeAddressForServiceability = useMemo(() => {
    if (!address.province || !address.region) return null;
    
    return {
      region: address.region,
      province: address.province,
      city: address.city_municipality || '',
      barangay: address.barangay || ''
    };
  }, [address.region, address.province, address.city_municipality, address.barangay]);

  // Debounced serviceability check
  const debouncedServiceabilityAddress = useDebounce(completeAddressForServiceability, 800);

  // Load regions on component mount
  useEffect(() => {
    const loadRegions = async () => {
      try {
        setLoadingRegions(true);
        setErrorRegions(null);
        const response = await authService.getRegions();
        setRegions(response.data || []);
      } catch (error) {
        console.error('Error loading regions:', error);
        setErrorRegions('Failed to load regions. Please refresh the page.');
      } finally {
        setLoadingRegions(false);
      }
    };

    loadRegions();
  }, []);

  // Initialize form with initial address data
  useEffect(() => {
    if (initialAddress && Object.keys(initialAddress).length > 0) {
      setAddress(prev => ({
        ...prev,
        ...initialAddress
      }));
      
      // Set PSGC selections if available
      if (initialAddress.region_id) {
        setSelectedRegionId(initialAddress.region_id);
        setIsNCR(initialAddress.region_id === '130000000');
      }
      if (initialAddress.province_id) {
        setSelectedProvinceId(initialAddress.province_id);
      }
      if (initialAddress.city_id) {
        setSelectedCityId(initialAddress.city_id);
      }
      if (initialAddress.barangay_id) {
        setSelectedBarangayId(initialAddress.barangay_id);
      }
    }
  }, [initialAddress]);

  // Load provinces/districts when region changes (debounced)
  useEffect(() => {
    if (debouncedRegionId) {
      setIsNCR(debouncedRegionId === '130000000');
      loadProvinces(debouncedRegionId);
    } else {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      setSelectedProvinceId('');
      setSelectedCityId('');
      setSelectedBarangayId('');
      setIsNCR(false);
    }
  }, [debouncedRegionId]);

  // Load cities when province changes (debounced)
  useEffect(() => {
    if (debouncedProvinceId) {
      loadCities(debouncedProvinceId);
    } else {
      setCities([]);
      setBarangays([]);
      setSelectedCityId('');
      setSelectedBarangayId('');
    }
  }, [debouncedProvinceId]);

  // Load barangays when city changes (debounced)
  useEffect(() => {
    if (debouncedCityId) {
      loadBarangays(debouncedCityId);
    } else {
      setBarangays([]);
      setSelectedBarangayId('');
    }
  }, [debouncedCityId]);

  // Validate form whenever address changes
  useEffect(() => {
    validateForm();
  }, [address, selectedRegionId, selectedProvinceId, selectedCityId, selectedBarangayId]);

  // Check serviceability when complete address is available (debounced)
  useEffect(() => {
    if (debouncedServiceabilityAddress && debouncedServiceabilityAddress.province) {
      checkServiceability(debouncedServiceabilityAddress);
    } else {
      setServiceabilityStatus(null);
      setServiceabilityMessage('');
    }
  }, [debouncedServiceabilityAddress]);

  // Notify parent component of changes
  useEffect(() => {
    if (onChange) {
      const completeAddress = {
        ...address,
        region_id: selectedRegionId,
        province_id: selectedProvinceId,
        city_id: selectedCityId,
        barangay_id: selectedBarangayId,
        region: regions.find(r => r.region_id === selectedRegionId)?.region_name || '',
        province: provinces.find(p => p.province_id === selectedProvinceId)?.province_name || '',
        city_municipality: cities.find(c => c.city_id === selectedCityId)?.city_name || '',
        barangay: barangays.find(b => b.barangay_id === selectedBarangayId)?.barangay_name || '',
        serviceability: {
          status: serviceabilityStatus,
          message: serviceabilityMessage
        }
      };
      
      onChange(completeAddress, isValid);
    }
  }, [address, selectedRegionId, selectedProvinceId, selectedCityId, selectedBarangayId, isValid, onChange, regions, provinces, cities, barangays, serviceabilityStatus, serviceabilityMessage]);

  const loadProvinces = useCallback(async (regionId) => {
    try {
      setLoadingProvinces(true);
      setErrors(prev => ({ ...prev, provinces: '' }));
      const response = await authService.getProvinces(regionId);
      const data = response.data || [];
      setProvinces(data);
      
      if (data.length === 0) {
        setErrors(prev => ({ 
          ...prev, 
          provinces: isNCR ? 'No districts found for NCR' : 'No provinces found for this region' 
        }));
      }
    } catch (error) {
      console.error('Error loading provinces:', error);
      setErrors(prev => ({ 
        ...prev, 
        provinces: isNCR ? 'Failed to load districts. Please try again.' : 'Failed to load provinces. Please try again.'
      }));
    } finally {
      setLoadingProvinces(false);
    }
  }, [isNCR]);

  const loadCities = useCallback(async (provinceId) => {
    try {
      setLoadingCities(true);
      setErrors(prev => ({ ...prev, cities: '' }));
      const response = await authService.getCities(provinceId);
      const data = response.data || [];
      setCities(data);
      
      if (data.length === 0) {
        setErrors(prev => ({ 
          ...prev, 
          cities: isNCR ? 'No cities found for this district' : 'No cities found for this province'
        }));
      }
    } catch (error) {
      console.error('Error loading cities:', error);
      setErrors(prev => ({ ...prev, cities: 'Failed to load cities. Please try again.' }));
    } finally {
      setLoadingCities(false);
    }
  }, [isNCR]);

  const loadBarangays = useCallback(async (cityId) => {
    try {
      setLoadingBarangays(true);
      setErrors(prev => ({ ...prev, barangays: '' }));
      const response = await authService.getBarangays(cityId);
      const data = response.data || [];
      setBarangays(data);
      
      if (data.length === 0) {
        setErrors(prev => ({ 
          ...prev, 
          barangays: 'No barangays found for this city'
        }));
      }
    } catch (error) {
      console.error('Error loading barangays:', error);
      setErrors(prev => ({ ...prev, barangays: 'Failed to load barangays. Please try again.' }));
    } finally {
      setLoadingBarangays(false);
    }
  }, []);

  const checkServiceability = useCallback(async (addressData) => {
    try {
      setServiceabilityStatus('checking');
      setServiceabilityMessage('Checking delivery serviceability...');
      
      const response = await authService.validateAddress(addressData);
      
      if (response.data.success) {
        const { serviceable, message } = response.data;
        setServiceabilityStatus(serviceable ? 'serviceable' : 'not-serviceable');
        setServiceabilityMessage(serviceable ? 
          '✅ This address is serviceable for delivery' : 
          '⚠️ Address not serviceable by our courier'
        );
      } else {
        // Fallback to assuming serviceable with warning
        setServiceabilityStatus('error');
        setServiceabilityMessage('⚠️ Could not verify delivery serviceability. Standard rates may apply.');
      }
    } catch (error) {
      console.error('Error checking serviceability:', error);
      // Fallback: Don't block the user, just show a warning
      setServiceabilityStatus('error');
      setServiceabilityMessage('⚠️ Could not verify delivery serviceability. Standard rates may apply.');
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleRegionChange = useCallback((e) => {
    const regionId = e.target.value;
    setSelectedRegionId(regionId);
    
    // Update address with region name
    const selectedRegion = regions.find(r => r.region_id === regionId);
    setAddress(prev => ({
      ...prev,
      region: selectedRegion?.region_name || ''
    }));
    
    // Clear dependent fields
    setSelectedProvinceId('');
    setSelectedCityId('');
    setSelectedBarangayId('');
    setAddress(prev => ({
      ...prev,
      province: '',
      city_municipality: '',
      barangay: ''
    }));
    
    if (errors.region) {
      setErrors(prev => ({ ...prev, region: '' }));
    }
  }, [regions, errors]);

  const handleProvinceChange = useCallback((e) => {
    const provinceId = e.target.value;
    setSelectedProvinceId(provinceId);
    
    // Update address with province name
    const selectedProvince = provinces.find(p => p.province_id === provinceId);
    setAddress(prev => ({
      ...prev,
      province: selectedProvince?.province_name || ''
    }));
    
    // Clear dependent fields
    setSelectedCityId('');
    setSelectedBarangayId('');
    setAddress(prev => ({
      ...prev,
      city_municipality: '',
      barangay: ''
    }));
    
    if (errors.province) {
      setErrors(prev => ({ ...prev, province: '' }));
    }
  }, [provinces, errors]);

  const handleCityChange = useCallback((e) => {
    const cityId = e.target.value;
    setSelectedCityId(cityId);
    
    // Update address with city name
    const selectedCity = cities.find(c => c.city_id === cityId);
    setAddress(prev => ({
      ...prev,
      city_municipality: selectedCity?.city_name || ''
    }));
    
    // Clear dependent fields
    setSelectedBarangayId('');
    setAddress(prev => ({
      ...prev,
      barangay: ''
    }));
    
    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
  }, [cities, errors]);

  const handleBarangayChange = useCallback((e) => {
    const barangayId = e.target.value;
    setSelectedBarangayId(barangayId);
    
    // Update address with barangay name
    const selectedBarangay = barangays.find(b => b.barangay_id === barangayId);
    setAddress(prev => ({
      ...prev,
      barangay: selectedBarangay?.barangay_name || ''
    }));
    
    if (errors.barangay) {
      setErrors(prev => ({ ...prev, barangay: '' }));
    }
  }, [barangays, errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    // Required fields validation
    if (!selectedRegionId) newErrors.region = 'Region is required';
    if (!selectedProvinceId) newErrors.province = 'Province is required';
    if (!selectedCityId) newErrors.city = 'City/Municipality is required';
    if (!selectedBarangayId) newErrors.barangay = 'Barangay is required';
    if (!address.house_number.trim()) newErrors.house_number = 'House number is required';
    if (!address.street_name.trim()) newErrors.street_name = 'Street name is required';
    if (!address.postcode.trim()) newErrors.postcode = 'Postal code is required';
    
    // Postal code validation (Philippine format)
    const postcodeRegex = /^\d{4}$/;
    if (address.postcode && !postcodeRegex.test(address.postcode)) {
      newErrors.postcode = 'Postal code must be 4 digits';
    }
    
    setErrors(newErrors);
    setIsValid(Object.keys(newErrors).length === 0);
  }, [selectedRegionId, selectedProvinceId, selectedCityId, selectedBarangayId, address.house_number, address.street_name, address.postcode]);

  const getFormattedAddress = () => {
    const parts = [];
    
    if (address.house_number) parts.push(address.house_number);
    if (address.building) parts.push(address.building);
    if (address.street_name) parts.push(address.street_name);
    if (address.barangay) parts.push(address.barangay);
    if (address.city_municipality) parts.push(address.city_municipality);
    if (address.province) parts.push(address.province);
    if (address.postcode) parts.push(address.postcode);
    
    return parts.join(', ');
  };

  const getServiceabilityClassName = () => {
    switch (serviceabilityStatus) {
      case 'serviceable':
        return 'serviceability-status serviceable';
      case 'not-serviceable':
        return 'serviceability-status not-serviceable';
      case 'error':
        return 'serviceability-status warning';
      case 'checking':
        return 'serviceability-status checking';
      default:
        return '';
    }
  };

  if (loadingRegions) {
    return (
      <div className="address-form">
        <div className="form-group">
          <div className="loading-placeholder">Loading address form...</div>
        </div>
      </div>
    );
  }

  if (errorRegions) {
    return (
      <div className="address-form">
        <div className="form-group">
          <div className="error-message">Error loading address form: {errorRegions}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="address-form">
      <h3>Delivery Address</h3>
      
      {/* Serviceability Status */}
      {serviceabilityMessage && (
        <div className={getServiceabilityClassName()}>
          {serviceabilityMessage}
          {serviceabilityStatus === 'not-serviceable' && (
            <small className="serviceability-note">
              You can still save this address, but delivery may not be available.
            </small>
          )}
        </div>
      )}
      
      {/* Region and Province/District */}
      <div className="form-row">
        <div className="form-group half required">
          <label htmlFor="region">Region</label>
          <select
            id="region"
            value={selectedRegionId}
            onChange={handleRegionChange}
            disabled={disabled || loadingRegions}
            required
          >
            <option value="">Select Region</option>
            {regions.map(region => (
              <option key={region.region_id} value={region.region_id}>
                {region.region_name}
              </option>
            ))}
          </select>
          {errors.region && <span className="error-text">{errors.region}</span>}
        </div>
        
        <div className="form-group half required">
          <label htmlFor="province">{isNCR ? 'District' : 'Province'}</label>
          <select
            id="province"
            value={selectedProvinceId}
            onChange={handleProvinceChange}
            disabled={disabled || !selectedRegionId || loadingProvinces}
            required
          >
            <option value="">{isNCR ? 'Select District' : 'Select Province'}</option>
            {provinces.map(province => (
              <option key={province.province_id} value={province.province_id}>
                {province.province_name}
              </option>
            ))}
          </select>
          {loadingProvinces && <span className="loading-text">Loading {isNCR ? 'districts' : 'provinces'}...</span>}
          {errors.provinces && <span className="error-text">{errors.provinces}</span>}
        </div>
      </div>

      {/* City/Municipality and Barangay */}
      <div className="form-row">
        <div className="form-group half required">
          <label htmlFor="city">City/Municipality</label>
          <select
            id="city"
            value={selectedCityId}
            onChange={handleCityChange}
            disabled={disabled || !selectedProvinceId || loadingCities}
            required
          >
            <option value="">Select City/Municipality</option>
            {cities.map(city => (
              <option key={city.city_id} value={city.city_id}>
                {city.city_name}
              </option>
            ))}
          </select>
          {loadingCities && <span className="loading-text">Loading cities...</span>}
          {errors.cities && <span className="error-text">{errors.cities}</span>}
          {cities.length === 0 && !loadingCities && !errors.cities && selectedProvinceId && (
            <span className="empty-data-message">No cities available</span>
          )}
        </div>
        
        <div className="form-group half required">
          <label htmlFor="barangay">Barangay</label>
          <select
            id="barangay"
            value={selectedBarangayId}
            onChange={handleBarangayChange}
            disabled={disabled || !selectedCityId || loadingBarangays}
            required
          >
            <option value="">Select Barangay</option>
            {barangays.map(barangay => (
              <option key={barangay.barangay_id} value={barangay.barangay_id}>
                {barangay.barangay_name}
              </option>
            ))}
          </select>
          {loadingBarangays && <span className="loading-text">Loading barangays...</span>}
          {errors.barangays && <span className="error-text">{errors.barangays}</span>}
          {barangays.length === 0 && !loadingBarangays && !errors.barangays && selectedCityId && (
            <span className="empty-data-message">No barangays available</span>
          )}
        </div>
      </div>
      
      {/* Street Name */}
      <div className="form-group required">
        <label htmlFor="street_name">Street Name</label>
        <input
          type="text"
          id="street_name"
          name="street_name"
          value={address.street_name}
          onChange={handleInputChange}
          placeholder="e.g., Rizal Street"
          disabled={disabled}
          required
        />
        {errors.street_name && <span className="error-text">{errors.street_name}</span>}
      </div>

      {/* House Number and Building */}
      <div className="form-row">
        <div className="form-group half required">
          <label htmlFor="house_number">House Number</label>
          <input
            type="text"
            id="house_number"
            name="house_number"
            value={address.house_number}
            onChange={handleInputChange}
            placeholder="e.g., 123"
            disabled={disabled}
            required
          />
          {errors.house_number && <span className="error-text">{errors.house_number}</span>}
        </div>
        
        <div className="form-group half">
          <label htmlFor="building">Building/Floor/Unit (Optional)</label>
          <input
            type="text"
            id="building"
            name="building"
            value={address.building}
            onChange={handleInputChange}
            placeholder="e.g., Unit 5A, 2nd Floor"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Postal Code and Address Type */}
      <div className="form-row">
        <div className="form-group half required">
          <label htmlFor="postcode">Postal Code</label>
          <input
            type="text"
            id="postcode"
            name="postcode"
            value={address.postcode}
            onChange={handleInputChange}
            placeholder="e.g., 1234"
            maxLength="4"
            disabled={disabled}
            required
          />
          {errors.postcode && <span className="error-text">{errors.postcode}</span>}
        </div>
        
        <div className="form-group half">
          <label htmlFor="address_type">Address Type</label>
          <select
            id="address_type"
            name="address_type"
            value={address.address_type}
            onChange={handleInputChange}
            disabled={disabled}
          >
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Address Preview */}
      {isValid && (
        <div className="form-group">
          <label>Complete Address Preview</label>
          <div className="address-preview">
            {getFormattedAddress()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressForm;
