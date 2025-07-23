const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const locationsController = require('../controllers/locationsController');

// Core PSGC hierarchy endpoints (what our frontend expects)
router.get('/regions', locationsController.getRegions);
router.get('/provinces/:regionId', locationsController.getProvinces);  // Get provinces for a region
router.get('/cities/:provinceId', locationsController.getCities);      // Get cities for a province/district
router.get('/barangays/:cityId', locationsController.getBarangays);   // Get barangays for a city
router.get('/districts/:regionId', locationsController.getDistrictsByRegion); // Get districts for NCR

// Individual item lookup endpoints
router.get('/region/:regionCode', locationsController.getRegion);
router.get('/province/:provinceCode', locationsController.getProvince);
router.get('/city/:cityCode', locationsController.getCity);
router.get('/barangay/:barangayCode', locationsController.getBarangay);
router.get('/district/:districtCode', locationsController.getDistrict);

// List all endpoints (for admin/debugging)
router.get('/all/provinces', locationsController.listProvinces);
router.get('/all/cities', locationsController.listCities);
router.get('/all/municipalities', locationsController.listMunicipalities);
router.get('/all/barangays', locationsController.listBarangays);
router.get('/all/districts', locationsController.listDistricts);
router.get('/all/sub-municipalities', locationsController.listSubMunicipalities);

// Special endpoints
router.get('/municipalities/:municipality', locationsController.getMunicipality);
router.get('/sub-municipalities/:subMunicipality', locationsController.getSubMunicipality);

// Validate and format address for NinjaVan
router.post('/validate-address', locationsController.validateAddress);

// Clear PSGC cache (admin only)
router.post('/clear-cache', [auth, admin], locationsController.clearPSGCCache);

module.exports = router;