// File: /server/routes/cms.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all blogs with essential fields
router.get('/blogs', async (req, res) => {
  try {
    const [results] = await db.query('SELECT blogID, title, category, tags, content, publish_date, status, created_at, updated_at, cover_image FROM blogs', []);
    
    // Convert the cover_image BLOB into a base64 string
    const blogs = results.map(blog => {
      if (blog.cover_image) {
        blog.cover_image = `data:image/jpeg;base64,${blog.cover_image.toString('base64')}`;
      }
      return blog;
    });
    
    res.json(blogs);
  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific blog by ID
router.get('/blogs/:blogID', async (req, res) => {
  try {
    const blogID = req.params.blogID;
    const [results] = await db.query('SELECT * FROM blogs WHERE blogID = ?', [blogID]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    const blog = results[0];
    
    // Convert cover image to base64 if it exists
    if (blog.cover_image) {
      blog.cover_image = `data:image/jpeg;base64,${blog.cover_image.toString('base64')}`;
    }
    
    res.json(blog);
  } catch (err) {
    console.error('Error fetching blog by ID:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Get all FAQs
router.get('/faqs', async (req, res) => {
  try {
    const [results] = await db.query('SELECT faqID, question, answer, publish_date, status, created_at, updated_at FROM faqs', []);
    res.json(results);
  } catch (err) {
    console.error('Error fetching FAQs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get zodiac information by zodiacID
router.get('/zodiacs/:zodiacID', async (req, res) => {
  try {
    const zodiacID = req.params.zodiacID;
    
    const [results] = await db.query(
      `SELECT * FROM prosper_guides 
       WHERE zodiacID IN ('Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig') 
       AND status = 'published' 
       AND zodiacID = ?`,
      [zodiacID]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Zodiac not found' });
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching zodiac:', err);
    res.status(404).json({ error: 'Zodiac not found' });
  }
});

module.exports = router;