import React, { useState, useEffect, useCallback } from 'react';
import { usePSGC } from '../../hooks/usePSGC';
import './AddressForm.css';

const AddressForm = ({ onChange, initialAddress = {}, disabled = false }) => {
  const { regions, loadingRegions, errorRegions, fetchProvinces, fetchCities, fetchBarangays } = usePSGC();
  
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
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  
  // Loading states
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

  // Initialize form with initial address data
  useEffect(() => {
    if (initialAddress) {
      setAddress(prev => ({
        ...prev,
        ...initialAddress
      }));
      
      // Set PSGC selections if available
      if (initialAddress.region_id) {
        setSelectedRegionId(initialAddress.region_id);
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

  // Load provinces when region changes
  useEffect(() => {
    if (selectedRegionId) {
      loadProvinces(selectedRegionId);
    } else {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      setSelectedProvinceId('');
      setSelectedCityId('');
      setSelectedBarangayId('');
    }
  }, [selectedRegionId]);

  // Load cities when province changes
  useEffect(() => {
    if (selectedProvinceId) {
      loadCities(selectedProvinceId);
    } else {
      setCities([]);
      setBarangays([]);
      setSelectedCityId('');
      setSelectedBarangayId('');
    }
  }, [selectedProvinceId]);

  // Load barangays when city changes
  useEffect(() => {
    if (selectedCityId) {
      loadBarangays(selectedCityId);
    } else {
      setBarangays([]);
      setSelectedBarangayId('');
    }
  }, [selectedCityId]);

  // Validate form whenever address changes
  useEffect(() => {
    validateForm();
  }, [address, selectedRegionId, selectedProvinceId, selectedCityId, selectedBarangayId]);

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
        barangay: barangays.find(b => b.barangay_id === selectedBarangayId)?.barangay_name || ''
      };
      
      onChange(completeAddress, isValid);
    }
  }, [address, selectedRegionId, selectedProvinceId, selectedCityId, selectedBarangayId, isValid, onChange, regions, provinces, cities, barangays]);

  const loadProvinces = async (regionId) => {
    try {
      setLoadingProvinces(true);
      const provincesData = await fetchProvinces(regionId);
      setProvinces(provincesData);
    } catch (error) {
      console.error('Error loading provinces:', error);
      setErrors(prev => ({ ...prev, provinces: 'Failed to load provinces' }));
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadCities = async (provinceId) => {
    try {
      setLoadingCities(true);
      const citiesData = await fetchCities(provinceId);
      setCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
      setErrors(prev => ({ ...prev, cities: 'Failed to load cities' }));
    } finally {
      setLoadingCities(false);
    }
  };

  const loadBarangays = async (cityId) => {
    try {
      setLoadingBarangays(true);
      const barangaysData = await fetchBarangays(cityId);
      setBarangays(barangaysData);
    } catch (error) {
      console.error('Error loading barangays:', error);
      setErrors(prev => ({ ...prev, barangays: 'Failed to load barangays' }));
    } finally {
      setLoadingBarangays(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRegionChange = (e) => {
    const regionId = e.target.value;
    setSelectedRegionId(regionId);
    
    // Update address with region name
    const selectedRegion = regions.find(r => r.region_id === regionId);
    setAddress(prev => ({
      ...prev,
      region: selectedRegion?.region_name || ''
    }));
    
    // Clear dependent fields
    setAddress(prev => ({
      ...prev,
      province: '',
      city_municipality: '',
      barangay: ''
    }));
    
    if (errors.region) {
      setErrors(prev => ({ ...prev, region: '' }));
    }
  };

  const handleProvinceChange = (e) => {
    const provinceId = e.target.value;
    setSelectedProvinceId(provinceId);
    
    // Update address with province name
    const selectedProvince = provinces.find(p => p.province_id === provinceId);
    setAddress(prev => ({
      ...prev,
      province: selectedProvince?.province_name || ''
    }));
    
    // Clear dependent fields
    setAddress(prev => ({
      ...prev,
      city_municipality: '',
      barangay: ''
    }));
    
    if (errors.province) {
      setErrors(prev => ({ ...prev, province: '' }));
    }
  };

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    setSelectedCityId(cityId);
    
    // Update address with city name
    const selectedCity = cities.find(c => c.city_id === cityId);
    setAddress(prev => ({
      ...prev,
      city_municipality: selectedCity?.city_name || ''
    }));
    
    // Clear dependent fields
    setAddress(prev => ({
      ...prev,
      barangay: ''
    }));
    
    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
  };

  const handleBarangayChange = (e) => {
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
  };

  const validateForm = () => {
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
  };

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
        </div>
      </div>
    );
  }

  return (
    <div className="address-form">
      <h3>Delivery Address</h3>
      
      {/* Region and Province */}
      <div className="form-row">
        <div className="form-group half">
          <label htmlFor="region">Region *</label>
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
        
        <div className="form-group half">
          <label htmlFor="province">Province *</label>
          <select
            id="province"
            value={selectedProvinceId}
            onChange={handleProvinceChange}
            disabled={disabled || !selectedRegionId || loadingProvinces}
            required
          >
            <option value="">Select Province</option>
            {provinces.map(province => (
              <option key={province.province_id} value={province.province_id}>
                {province.province_name}
              </option>
            ))}
          </select>
          {loadingProvinces && <span className="loading-text">Loading provinces...</span>}
          {errors.province && <span className="error-text">{errors.province}</span>}
        </div>
      </div>

      {/* City/Municipality and Barangay */}
      <div className="form-row">
        <div className="form-group half">
          <label htmlFor="city">City/Municipality *</label>
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
          {errors.city && <span className="error-text">{errors.city}</span>}
        </div>
        
        <div className="form-group half">
          <label htmlFor="barangay">Barangay *</label>
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
          {errors.barangay && <span className="error-text">{errors.barangay}</span>}
        </div>
      </div>
      
      {/* Street Name */}
      <div className="form-group">
        <label htmlFor="street_name">Street Name *</label>
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
        <div className="form-group half">
          <label htmlFor="house_number">House Number *</label>
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
        <div className="form-group half">
          <label htmlFor="postcode">Postal Code *</label>
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
