const pechkin = require('pechkin');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure the upload options
const uploadOptions = {
  uploadDir: uploadsDir,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

const uploadProductImage = async (req, res, next) => {
  try {
    // Parse the incoming form data
    const uploadResult = await pechkin.parseAsync(req, uploadOptions);
    
    // Add the file data to the request object
    req.files = uploadResult.files;
    req.body = { ...req.body, ...uploadResult.fields };
    
    // If an image was uploaded, add its path to the request body
    if (uploadResult.files && uploadResult.files.productImage) {
      const imageFile = uploadResult.files.productImage[0];
      req.body.image_url = `/uploads/${imageFile.savedPath.replace(uploadsDir, '')}`;
    }
    
    next();
  } catch (error) {
    console.error('File upload error:', error);
    res.status(400).json({ message: error.message || 'Error uploading file' });
  }
};

module.exports = { uploadProductImage }; 