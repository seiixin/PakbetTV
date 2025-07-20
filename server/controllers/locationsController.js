const axios = require('axios');

// PSGC API base URL
const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

// Cache for PSGC data to reduce API calls
const psgcCache = {
  regions: null,
  provinces: {},
  cities: {},
  barangays: {},
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  lastUpdated: null
};

// Helper function to check if cache is valid
const isCacheValid = () => {
  return psgcCache.lastUpdated && 
         (Date.now() - psgcCache.lastUpdated) < psgcCache.cacheExpiry;
};

// Helper function to make PSGC API calls with error handling
const makePSGCCall = async (endpoint) => {
  try {
    console.log('🔍 [SERVER] Making PSGC API call to:', endpoint);
    const response = await axios.get(`${PSGC_BASE_URL}${endpoint}`, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PakbetTV-ECommerce/1.0'
      }
    });
    console.log('🔍 [SERVER] PSGC API response received for:', endpoint);
    return response.data;
  } catch (error) {
    console.error(`❌ [SERVER] PSGC API error for ${endpoint}:`, error.message);
    throw new Error(`Failed to fetch location data: ${error.message}`);
  }
};

// Handler for GET /api/locations/regions
async function getRegions(req, res) {
  try {
    console.log('🔍 [SERVER] getRegions called');
    
    // Return cached data if valid
    if (psgcCache.regions && isCacheValid()) {
      console.log('🔍 [SERVER] Returning cached regions data');
      return res.json(psgcCache.regions);
    }

    console.log('🔍 [SERVER] Fetching regions from PSGC API...');
    const regions = await makePSGCCall('/regions/');
    
    // Transform PSGC data to match expected format
    const transformedRegions = regions.map(region => ({
      region_id: region.code,
      region_name: region.regionName || region.name,
      psgc_code: region.code,
      original_data: region
    }));

    console.log('🔍 [SERVER] Transformed regions data:', {
      count: transformedRegions.length,
      sample: transformedRegions.slice(0, 3)
    });

    // Update cache
    psgcCache.regions = transformedRegions;
    psgcCache.lastUpdated = Date.now();

    res.json(transformedRegions);
    console.log('🔍 [SERVER] Regions sent to client successfully');
  } catch (error) {
    console.error('❌ [SERVER] Error fetching regions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
}

// Handler for GET /api/locations/provinces/:regionId
async function getProvinces(req, res) {
  try {
    const { regionId } = req.params;
    console.log('🔍 [SERVER] getProvinces called with regionId:', regionId);
    
    if (!regionId) {
      return res.status(400).json({ message: 'Region ID is required' });
    }

    // Check cache first
    if (psgcCache.provinces[regionId] && isCacheValid()) {
      console.log('🔍 [SERVER] Returning cached provinces data for region:', regionId);
      return res.json(psgcCache.provinces[regionId]);
    }

    console.log('🔍 [SERVER] Fetching provinces for region', regionId, 'from PSGC API...');
    const provinces = await makePSGCCall(`/regions/${regionId}/provinces/`);
    
    // Transform PSGC data to match expected format
    const transformedProvinces = provinces.map(province => ({
      province_id: province.code,
      province_name: province.name,
      region_id: regionId,
      psgc_code: province.code,
      original_data: province
    }));

    console.log('🔍 [SERVER] Transformed provinces data:', {
      regionId,
      count: transformedProvinces.length,
      sample: transformedProvinces.slice(0, 3)
    });

    // Update cache
    psgcCache.provinces[regionId] = transformedProvinces;

    res.json(transformedProvinces);
    console.log('🔍 [SERVER] Provinces sent to client successfully');
  } catch (error) {
    console.error('❌ [SERVER] Error fetching provinces:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
}

// Handler for GET /api/locations/cities/:provinceId
async function getCities(req, res) {
  try {
    const { provinceId } = req.params;
    console.log('🔍 [SERVER] getCities called with provinceId:', provinceId);
    
    if (!provinceId) {
      return res.status(400).json({ message: 'Province ID is required' });
    }

    // Check cache first
    if (psgcCache.cities[provinceId] && isCacheValid()) {
      console.log('🔍 [SERVER] Returning cached cities data for province:', provinceId);
      return res.json(psgcCache.cities[provinceId]);
    }

    console.log('🔍 [SERVER] Fetching cities for province', provinceId, 'from PSGC API...');
    const cities = await makePSGCCall(`/provinces/${provinceId}/cities-municipalities/`);
    
    // Transform PSGC data to match expected format
    const transformedCities = cities.map(city => ({
      city_id: city.code,
      city_name: city.name,
      province_id: provinceId,
      psgc_code: city.code,
      original_data: city
    }));

    console.log('🔍 [SERVER] Transformed cities data:', {
      provinceId,
      count: transformedCities.length,
      sample: transformedCities.slice(0, 3)
    });

    // Update cache
    psgcCache.cities[provinceId] = transformedCities;

    res.json(transformedCities);
    console.log('🔍 [SERVER] Cities sent to client successfully');
  } catch (error) {
    console.error('❌ [SERVER] Error fetching cities:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
}

// Handler for GET /api/locations/barangays/:cityId
async function getBarangays(req, res) {
  try {
    const { cityId } = req.params;
    console.log('🔍 [SERVER] getBarangays called with cityId:', cityId);
    
    if (!cityId) {
      return res.status(400).json({ message: 'City ID is required' });
    }

    // Check cache first
    if (psgcCache.barangays[cityId] && isCacheValid()) {
      console.log('🔍 [SERVER] Returning cached barangays data for city:', cityId);
      return res.json(psgcCache.barangays[cityId]);
    }

    console.log('🔍 [SERVER] Fetching barangays for city', cityId, 'from PSGC API...');
    const barangays = await makePSGCCall(`/cities-municipalities/${cityId}/barangays/`);
    
    // Transform PSGC data to match expected format
    const transformedBarangays = barangays.map(barangay => ({
      barangay_id: barangay.code,
      barangay_name: barangay.name,
      city_id: cityId,
      psgc_code: barangay.code,
      original_data: barangay
    }));

    console.log('🔍 [SERVER] Transformed barangays data:', {
      cityId,
      count: transformedBarangays.length,
      sample: transformedBarangays.slice(0, 3)
    });

    // Update cache
    psgcCache.barangays[cityId] = transformedBarangays;

    res.json(transformedBarangays);
    console.log('🔍 [SERVER] Barangays sent to client successfully');
  } catch (error) {
    console.error('❌ [SERVER] Error fetching barangays:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
}

// Handler for POST /api/locations/validate-address
async function validateAddress(req, res) {
  try {
    const { region, province, city, barangay } = req.body;
    console.log('🔍 [SERVER] validateAddress called with:', { region, province, city, barangay });
    
    // Validate that all required fields are provided
    if (!region || !province || !city) {
      return res.status(400).json({
        message: 'Missing required address fields',
        required: ['region', 'province', 'city']
      });
    }

    // Format address for NinjaVan compatibility
    const formattedAddress = {
      region: region,
      province: province,
      city: city,
      barangay: barangay || '',
      // Combine for NinjaVan area field
      area: barangay || city,
      // Ensure proper formatting for delivery
      formatted_for_ninjavan: true
    };

    console.log('🔍 [SERVER] Address validated successfully:', formattedAddress);

    res.json({
      success: true,
      address: formattedAddress,
      message: 'Address validated and formatted successfully'
    });
  } catch (error) {
    console.error('❌ [SERVER] Error validating address:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
}

// Handler for POST /api/locations/clear-cache (admin only)
async function clearPSGCCache(req, res) {
  try {
    console.log('🔍 [SERVER] clearPSGCCache called');
    
    psgcCache.regions = null;
    psgcCache.provinces = {};
    psgcCache.cities = {};
    psgcCache.barangays = {};
    psgcCache.lastUpdated = null;
    
    res.json({
      success: true,
      message: 'PSGC cache cleared successfully'
    });
  } catch (error) {
    console.error('❌ [SERVER] Error clearing PSGC cache:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
}

module.exports = {
  getRegions,
  getProvinces,
  getCities,
  getBarangays,
  validateAddress,
  clearPSGCCache
};
