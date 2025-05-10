const axios = require('axios');
const config = require('../config/keys');
const db = require('../config/db');

class NinjaVanAuthService {
  constructor() {
    this.API_BASE_URL = config.NINJAVAN_API_URL;
    this.COUNTRY_CODE = 'SG'; // Always use SG as per requirements
    this.CLIENT_ID = config.NINJAVAN_CLIENT_ID;
    this.CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;
  }

  async getStoredToken() {
    const [rows] = await db.query(
      'SELECT token, expires_at FROM ninja_van_tokens WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    );
    return rows[0];
  }

  async storeToken(token, expiresIn) {
    // Deactivate all existing tokens
    await db.query('UPDATE ninja_van_tokens SET is_active = 0');
    
    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));
    
    // Store new token
    await db.query(
      'INSERT INTO ninja_van_tokens (token, expires_at, is_active) VALUES (?, ?, 1)',
      [token, expiresAt]
    );
  }

  async generateNewToken() {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/${this.COUNTRY_CODE}/2.0/oauth/access_token`, {
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        grant_type: 'client_credentials'
      });

      const { access_token, expires_in } = response.data;
      await this.storeToken(access_token, expires_in);
      return access_token;
    } catch (error) {
      console.error('Error generating NinjaVan token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with NinjaVan');
    }
  }

  isTokenExpiringSoon(expiresAt) {
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return new Date(expiresAt).getTime() - Date.now() <= fiveMinutes;
  }

  async getValidToken() {
    try {
      const storedToken = await this.getStoredToken();
      
      // If no token exists or token is expiring soon, generate new one
      if (!storedToken || this.isTokenExpiringSoon(storedToken.expires_at)) {
        return await this.generateNewToken();
      }
      
      return storedToken.token;
    } catch (error) {
      console.error('Error getting valid token:', error);
      throw error;
    }
  }

  // Create axios instance with token refresh interceptor
  createAxiosInstance() {
    const instance = axios.create({
      baseURL: this.API_BASE_URL
    });

    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Get new token
          const token = await this.generateNewToken();
          
          // Update request header
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          
          // Retry the request
          return instance(originalRequest);
        }
        
        return Promise.reject(error);
      }
    );

    return instance;
  }
}

module.exports = new NinjaVanAuthService(); 