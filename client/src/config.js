// In development, use relative paths to leverage Vite's proxy
// In production, use the full URL from environment variables
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? '' : (window.env?.REACT_APP_API_URL || '');

export default API_BASE_URL;

// This should use the same logic as API_BASE_URL above, not hardcode localhost
export const BASE_URL = API_BASE_URL; 