// File: /server/routes/cms.js
const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');

router.get('/blogs', cmsController.getBlogs);
router.get('/blogs/search', cmsController.searchBlogs);
router.get('/product-guides/search', cmsController.searchProductGuides);
router.get('/blogs/:blogID', cmsController.getBlogById);
router.get('/faqs', cmsController.getFaqs);
router.get('/zodiacs/:zodiacID', cmsController.getZodiacById);
router.get('/zodiacs', cmsController.searchZodiacs);

module.exports = router;