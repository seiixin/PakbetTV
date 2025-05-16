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
    console.log('Zodiac search query received:', searchQuery);
    
    if (!searchQuery) {
      return res.json([]);
    }

    const searchTerm = `%${searchQuery.toLowerCase()}%`;
    const [results] = await db.query(
      `SELECT zodiacID, overview, career, health, love, wealth, status
       FROM prosper_guides 
       WHERE zodiacID IN ('Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig')
       AND status = 'published'
       AND (LOWER(zodiacID) LIKE ? 
         OR LOWER(overview) LIKE ? 
         OR LOWER(career) LIKE ? 
         OR LOWER(health) LIKE ? 
         OR LOWER(love) LIKE ? 
         OR LOWER(wealth) LIKE ?)
       ORDER BY 
         CASE 
           WHEN LOWER(zodiacID) LIKE ? THEN 1
           WHEN LOWER(overview) LIKE ? THEN 2
           ELSE 3
         END`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );

    console.log(`Found ${results.length} zodiac results`);
    
    res.json(results);
  } catch (err) {
    console.error('Error searching zodiacs:', err);
    res.status(500).json({ 
      error: 'Server error during zodiac search',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Search blogs
router.get('/blogs/search', async (req, res) => {
  try {
    const searchQuery = req.query.query;
    console.log('Blog search query received:', searchQuery);
    
    if (!searchQuery) {
      return res.json([]);
    }

    const searchTerm = `%${searchQuery}%`;
    const [results] = await db.query(
      `SELECT blogID, title, category, tags, content, publish_date, status, created_at, updated_at, cover_image 
       FROM blogs 
       WHERE (LOWER(title) LIKE LOWER(?) 
          OR LOWER(content) LIKE LOWER(?) 
          OR LOWER(category) LIKE LOWER(?) 
          OR LOWER(tags) LIKE LOWER(?))
       AND status = 'published'
       ORDER BY 
         CASE 
           WHEN LOWER(title) LIKE LOWER(?) THEN 1
           WHEN LOWER(category) LIKE LOWER(?) THEN 2
           ELSE 3
         END,
         publish_date DESC 
       LIMIT 5`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );

    console.log(`Found ${results.length} blog results`);

    // Convert cover images to base64 and handle errors gracefully
    const blogs = results.map(blog => {
      try {
        if (blog.cover_image) {
          if (Buffer.isBuffer(blog.cover_image)) {
            blog.cover_image = `data:image/jpeg;base64,${blog.cover_image.toString('base64')}`;
          } else if (typeof blog.cover_image === 'string') {
            // If it's already a string (URL), use it as is
            blog.cover_image = blog.cover_image.startsWith('/') ? blog.cover_image : `/${blog.cover_image}`;
          }
        }
        return {
          ...blog,
          tags: blog.tags ? blog.tags.split(',').map(tag => tag.trim()) : []
        };
      } catch (err) {
        console.error(`Error processing blog ${blog.blogID}:`, err);
        return {
          ...blog,
          cover_image: null,
          tags: []
        };
      }
    });

    res.json(blogs);
  } catch (err) {
    console.error('Error searching blogs:', err);
    res.status(500).json({ 
      error: 'Server error during blog search',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;