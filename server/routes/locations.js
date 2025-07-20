const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const locationsController = require('../controllers/locationsController');

// Get all regions
router.get('/regions', locationsController.getRegions);

// Get provinces by region ID
router.get('/provinces/:regionId', locationsController.getProvinces);

// Get cities by province ID
router.get('/cities/:provinceId', locationsController.getCities);

// Get barangays by city ID
router.get('/barangays/:cityId', locationsController.getBarangays);

// Validate and format address for NinjaVan
router.post('/validate-address', locationsController.validateAddress);

// Clear PSGC cache (admin only)
router.post('/clear-cache', [auth, admin], locationsController.clearPSGCCache);

module.exports = router; 