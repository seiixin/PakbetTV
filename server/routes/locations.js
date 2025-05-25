const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all regions
router.get('/regions', async (req, res) => {
  try {
    const [regions] = await db.query('SELECT region_id, region_name FROM regions ORDER BY region_name');
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get provinces by region ID
router.get('/provinces/:regionId', async (req, res) => {
  try {
    const { regionId } = req.params;
    const [provinces] = await db.query(
      'SELECT province_id, province_name FROM provinces WHERE region_id = ? ORDER BY province_name',
      [regionId]
    );
    res.json(provinces);
  } catch (error) {
    console.error('Error fetching provinces:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cities by province ID
router.get('/cities/:provinceId', async (req, res) => {
  try {
    const { provinceId } = req.params;
    const [cities] = await db.query(
      'SELECT city_id, city_name FROM cities WHERE province_id = ? ORDER BY city_name',
      [provinceId]
    );
    res.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 