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

// Search zodiacs
router.get('/zodiacs', async (req, res) => {
  try {
    const searchQuery = req.query.search;
    console.log('Received search query:', searchQuery);
    
    if (!searchQuery) {
      console.log('No search query provided, returning empty array');
      return res.json([]);
    }

    // Get all zodiac signs first
    const [results] = await db.query(
      `SELECT * FROM prosper_guides 
       WHERE zodiacID IN ('Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig')
       AND status = 'published'`
    );

    console.log('All zodiac signs:', results.map(r => r.zodiacID));

    // Filter results in JavaScript for more flexible matching
    const filteredResults = results.filter(zodiac => {
      const match = zodiac.zodiacID.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   zodiac.overview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   zodiac.career?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   zodiac.health?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   zodiac.love?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   zodiac.wealth?.toLowerCase().includes(searchQuery.toLowerCase());
      console.log(`Checking zodiac ${zodiac.zodiacID} against ${searchQuery}: ${match}`);
      return match;
    });

    console.log('Filtered results:', filteredResults.map(r => r.zodiacID));
    
    res.json(filteredResults);
  } catch (err) {
    console.error('Error searching zodiacs:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Search blogs
router.get('/blogs/search', async (req, res) => {
  try {
    const searchQuery = req.query.query;
    
    if (!searchQuery) {
      return res.json([]);
    }

    const [results] = await db.query(
      `SELECT blogID, title, category, tags, content, publish_date, status, created_at, updated_at, cover_image 
       FROM blogs 
       WHERE (title LIKE ? OR content LIKE ? OR category LIKE ? OR tags LIKE ?) 
       AND status = 'published'
       ORDER BY publish_date DESC 
       LIMIT 5`,
      [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
    );

    // Convert cover images to base64
    const blogs = results.map(blog => {
      if (blog.cover_image) {
        blog.cover_image = `data:image/jpeg;base64,${blog.cover_image.toString('base64')}`;
      }
      return blog;
    });

    res.json(blogs);
  } catch (err) {
    console.error('Error searching blogs:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;