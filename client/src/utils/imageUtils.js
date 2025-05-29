import API_BASE_URL from '../config';

export const getFullImageUrl = (url) => {
  if (!url) {
    return '/placeholder-product.jpg';
  }
  
  // Handle case where url is an object (longblob from database)
  if (typeof url === 'object') {
    if (url.data) {
      // Handle Uint8Array or Array data
      if (url.data instanceof Uint8Array || Array.isArray(url.data)) {
        try {
          // Convert to Uint8Array if it's a regular array
          const uint8Array = url.data instanceof Uint8Array ? url.data : new Uint8Array(url.data);
          
          // Convert to base64 using browser-safe method
          let binary = '';
          const chunkSize = 8192; // Process in chunks to avoid stack overflow
          
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
          }
          
          const base64 = btoa(binary);
          return `data:${url.type || 'image/jpeg'};base64,${base64}`;
        } catch (error) {
          console.error('Error converting image data to base64:', error);
          return '/placeholder-product.jpg';
        }
      }
      
      // Handle base64 string data
      if (typeof url.data === 'string') {
        return `data:${url.type || 'image/jpeg'};base64,${url.data}`;
      }
    }
    
    // If the object itself is a Uint8Array
    if (url instanceof Uint8Array) {
      try {
        let binary = '';
        const chunkSize = 8192; // Process in chunks to avoid stack overflow
        
        for (let i = 0; i < url.length; i += chunkSize) {
          const chunk = url.slice(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        
        const base64 = btoa(binary);
        return `data:image/jpeg;base64,${base64}`;
      } catch (error) {
        console.error('Error converting Uint8Array to base64:', error);
        return '/placeholder-product.jpg';
      }
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