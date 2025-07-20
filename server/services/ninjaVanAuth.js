const axios = require('axios');
const config = require('../config/keys');
const db = require('../config/db');

class NinjaVanAuthService {
  constructor() {
    this.API_BASE_URL = config.NINJAVAN_API_URL;
    this.COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE;
    this.CLIENT_ID = config.NINJAVAN_CLIENT_ID;
    this.CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;
    this.tokenCache = null;
    this.tokenExpiry = null;
    this.tokenRefreshPromise = null;
  }

  async getValidToken() {
    try {
      // Check if we have a valid cached token
      if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.tokenCache;
      }

      // If a token refresh is already in progress, wait for it
      if (this.tokenRefreshPromise) {
        return await this.tokenRefreshPromise;
      }

      // Start a new token refresh
      this.tokenRefreshPromise = this.generateNewToken();
      const token = await this.tokenRefreshPromise;
      this.tokenRefreshPromise = null;
      return token;
    } catch (error) {
      this.tokenRefreshPromise = null;
      throw error;
    }
  }

  async generateNewToken() {
    try {
      const response = await axios.post(
        `${this.API_BASE_URL}/${this.COUNTRY_CODE}/2.0/oauth/access_token`,
        {
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          grant_type: 'client_credentials'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const { access_token, expires_in } = response.data;
      
      // Cache the token and set expiry (subtract 5 minutes for safety margin)
      this.tokenCache = access_token;
      this.tokenExpiry = Date.now() + ((expires_in - 300) * 1000);

      // Store token in database for backup/audit
      await this.storeToken(access_token, expires_in);
      
      return access_token;
    } catch (error) {
      console.error('NinjaVan token error:', error.response?.data || error.message);
      
      // Log failed attempts
      try {
        await db.query(
          'INSERT INTO auth_logs (provider, event_type, error_details) VALUES (?, ?, ?)',
          ['NinjaVan', 'token_generation_failed', JSON.stringify({
            error: error.message,
            response: error.response?.data
          })]
        );
      } catch (logError) {
        // If auth_logs table doesn't exist, just log to console
        console.error('Failed to log auth error to database:', logError.message);
        console.error('NinjaVan token generation failed:', {
          error: error.message,
          response: error.response?.data
        });
      }

      throw new Error('Failed to authenticate with NinjaVan');
    }
  }

  async storeToken(token, expiresIn) {
    try {
      // Deactivate all existing tokens
      await db.query('UPDATE ninja_van_tokens SET is_active = 0');
      
      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));
      
      // Store new token using existing table structure
      await db.query(
        'INSERT INTO ninja_van_tokens (token, expires_at, is_active) VALUES (?, ?, 1)',
        [token, expiresAt]
      );
    } catch (error) {
      console.error('Error storing NinjaVan token:', error);
      // Non-blocking error - don't throw
    }
  }

  // Create axios instance with token refresh interceptor
  createAxiosInstance() {
    const instance = axios.create({
      baseURL: this.API_BASE_URL
    });

    instance.interceptors.request.use(
      async (config) => {
        const token = await this.getValidToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Force token refresh
          this.tokenCache = null;
          this.tokenExpiry = null;
          
          // Get new token
          const token = await this.generateNewToken();
          
          // Update request header
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
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