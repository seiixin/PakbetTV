const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');

// Get all regions
router.get('/regions', locationsController.getRegions);

// Get provinces by region ID
router.get('/provinces/:regionId', locationsController.getProvinces);

// Get cities by province ID
router.get('/cities/:provinceId', locationsController.getCities);

module.exports = router; 