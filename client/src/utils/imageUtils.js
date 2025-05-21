import API_BASE_URL from '../config';

export const getFullImageUrl = (url) => {
  if (!url) {
    return '/placeholder-product.jpg';
  }
  
  // Handle case where url is an object (longblob from database)
  if (typeof url === 'object') {
    if (url.data) {
      // Handle Buffer or Uint8Array data
      if (url.data instanceof Uint8Array || Buffer.isBuffer(url.data)) {
        return `data:${url.type || 'image/jpeg'};base64,${Buffer.from(url.data).toString('base64')}`;
      }
      // Handle base64 string data
      if (typeof url.data === 'string') {
        return `data:${url.type || 'image/jpeg'};base64,${url.data}`;
      }
    }
    // If the object itself is a Buffer or Uint8Array
    if (url instanceof Uint8Array || Buffer.isBuffer(url)) {
      return `data:image/jpeg;base64,${Buffer.from(url).toString('base64')}`;
    }
    return '/placeholder-product.jpg';
  }
  
  // Handle string URLs
  if (typeof url === 'string') {
    // Handle base64 encoded images
    if (url.startsWith('data:')) {
      return url; // Already a full data URL
    }
    
    // Handle absolute URLs
    if (url.startsWith('http')) {
      return url;
    }
    
    // Handle uploads paths
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Handle other relative paths
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Any other format
    return `${API_BASE_URL}/uploads/${url}`;
  }
  
  return '/placeholder-product.jpg';
}; 