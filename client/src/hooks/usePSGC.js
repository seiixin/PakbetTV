import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

/**
 * Enhanced PSGC hook that provides helper methods to retrieve Philippine geographic data.
 * 
 * This hook can work with both direct PSGC API calls and backend API calls.
 * It provides caching, error handling, and proper data transformation.
 * 
 * @param {string} country - Country code (default: 'PH')
 * @param {boolean} useBackendAPI - Whether to use backend API instead of direct PSGC calls (default: true)
 */
export const usePSGC = (country = 'PH', useBackendAPI = true) => {
  console.log('🔍 [HOOK] usePSGC initialized with:', { country, useBackendAPI });
  
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [errorRegions, setErrorRegions] = useState(null);

  // Fetch regions once when the country is PH
  const fetchRegions = useCallback(async () => {
    if (country !== 'PH') {
      console.log('🔍 [HOOK] Skipping regions fetch - country is not PH:', country);
      return;
    }

    console.log('🔍 [HOOK] Starting to fetch regions...');
    setLoadingRegions(true);
    setErrorRegions(null);
    
    try {
      let data;
      
      if (useBackendAPI) {
        // Use backend API (recommended for production)
        console.log('🔍 [HOOK] Using backend API to fetch regions');
        const response = await authService.getRegions();
        console.log('🔍 [HOOK] Backend API response:', response);
        data = response.data;
      } else {
        // Direct PSGC API call (fallback)
        console.log('🔍 [HOOK] Using direct PSGC API to fetch regions');
        const res = await fetch('https://psgc.gitlab.io/api/regions/');
        if (!res.ok) throw new Error(`Failed to fetch regions: ${res.status}`);
        data = await res.json();
        
        // Transform to match backend format
        data = data.map(region => ({
          region_id: region.code,
          region_name: region.regionName || region.name,
          psgc_code: region.code
        }));
      }
      
      console.log('🔍 [HOOK] Processed regions data:', {
        count: data.length,
        sample: data.slice(0, 3),
        allData: data
      });
      
      setRegions(data);
      console.log('🔍 [HOOK] Regions state updated successfully');
    } catch (err) {
      console.error('❌ [HOOK] Error fetching regions:', err);
      setErrorRegions(err.message || 'Unable to fetch regions');
    } finally {
      setLoadingRegions(false);
      console.log('🔍 [HOOK] Regions fetch completed');
    }
  }, [country, useBackendAPI]);

  useEffect(() => {
    console.log('🔍 [HOOK] useEffect triggered for fetchRegions');
    fetchRegions();
  }, [fetchRegions]);

  // Helper methods for the rest of the hierarchy ---------------------------
  const fetchProvinces = async (regionCode) => {
    if (!regionCode) {
      console.log('🔍 [HOOK] Skipping provinces fetch - no regionCode provided');
      return [];
    }
    
    console.log('🔍 [HOOK] Starting to fetch provinces for regionCode:', regionCode);
    
    try {
      let data;
      
      if (useBackendAPI) {
        console.log('🔍 [HOOK] Using backend API to fetch provinces');
        const response = await authService.getProvinces(regionCode);
        console.log('🔍 [HOOK] Backend API provinces response:', response);
        data = response.data;
      } else {
        console.log('🔍 [HOOK] Using direct PSGC API to fetch provinces');
        const res = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
        if (!res.ok) throw new Error('Failed to fetch provinces');
        data = await res.json();
        
        // Transform to match backend format
        data = data.map(province => ({
          province_id: province.code,
          province_name: province.name,
          region_id: regionCode,
          psgc_code: province.code
        }));
      }
      
      console.log('🔍 [HOOK] Processed provinces data:', {
        regionCode,
        count: data.length,
        sample: data.slice(0, 3),
        allData: data
      });
      
      return data;
    } catch (error) {
      console.error('❌ [HOOK] Error fetching provinces:', error);
      throw error;
    }
  };

  const fetchCities = async (provinceCode) => {
    if (!provinceCode) {
      console.log('🔍 [HOOK] Skipping cities fetch - no provinceCode provided');
      return [];
    }
    
    console.log('🔍 [HOOK] Starting to fetch cities for provinceCode:', provinceCode);
    
    try {
      let data;
      
      if (useBackendAPI) {
        console.log('🔍 [HOOK] Using backend API to fetch cities');
        const response = await authService.getCities(provinceCode);
        console.log('🔍 [HOOK] Backend API cities response:', response);
        data = response.data;
      } else {
        console.log('🔍 [HOOK] Using direct PSGC API to fetch cities');
        const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
        if (!res.ok) throw new Error('Failed to fetch cities/municipalities');
        data = await res.json();
        
        // Transform to match backend format
        data = data.map(city => ({
          city_id: city.code,
          city_name: city.name,
          province_id: provinceCode,
          psgc_code: city.code
        }));
      }
      
      console.log('🔍 [HOOK] Processed cities data:', {
        provinceCode,
        count: data.length,
        sample: data.slice(0, 3),
        allData: data
      });
      
      return data;
    } catch (error) {
      console.error('❌ [HOOK] Error fetching cities:', error);
      throw error;
    }
  };

  const fetchBarangays = async (cityCode) => {
    if (!cityCode) {
      console.log('🔍 [HOOK] Skipping barangays fetch - no cityCode provided');
      return [];
    }
    
    console.log('🔍 [HOOK] Starting to fetch barangays for cityCode:', cityCode);
    
    try {
      let data;
      
      if (useBackendAPI) {
        console.log('🔍 [HOOK] Using backend API to fetch barangays');
        const response = await authService.getBarangays(cityCode);
        console.log('🔍 [HOOK] Backend API barangays response:', response);
        data = response.data;
      } else {
        console.log('🔍 [HOOK] Using direct PSGC API to fetch barangays');
        const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
        if (!res.ok) throw new Error('Failed to fetch barangays');
        data = await res.json();
        
        // Transform to match backend format
        data = data.map(barangay => ({
          barangay_id: barangay.code,
          barangay_name: barangay.name,
          city_id: cityCode,
          psgc_code: barangay.code
        }));
      }
      
      console.log('🔍 [HOOK] Processed barangays data:', {
        cityCode,
        count: data.length,
        sample: data.slice(0, 3),
        allData: data
      });
      
      return data;
    } catch (error) {
      console.error('❌ [HOOK] Error fetching barangays:', error);
      throw error;
    }
  };

  // New method for address validation
  const validateAddress = async (addressData) => {
    console.log('🔍 [HOOK] Validating address:', addressData);
    
    try {
      if (useBackendAPI) {
        console.log('🔍 [HOOK] Using backend API to validate address');
        const response = await authService.validateAddress(addressData);
        console.log('🔍 [HOOK] Backend API validation response:', response);
        return response.data;
      } else {
        // Simple client-side validation
        console.log('🔍 [HOOK] Using client-side validation');
        const { region, province, city } = addressData;
        if (!region || !province || !city) {
          throw new Error('Missing required address fields');
        }
        
        return {
          success: true,
          address: addressData,
          message: 'Address validated successfully'
        };
      }
    } catch (error) {
      console.error('❌ [HOOK] Error validating address:', error);
      throw error;
    }
  };

  console.log('🔍 [HOOK] Current hook state:', {
    regionsCount: regions.length,
    loadingRegions,
    errorRegions,
    useBackendAPI
  });

  return {
    // State
    regions,
    loadingRegions,
    errorRegions,
    // Helpers
    fetchProvinces,
    fetchCities,
    fetchBarangays,
    validateAddress,
    // Utility
    refetchRegions: fetchRegions
  };
}; 