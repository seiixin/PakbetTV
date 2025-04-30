import axios from 'axios';
import API_BASE_URL from '../config'; 
const API_URL = `${API_BASE_URL}/api`; 
const api = axios.create({
  baseURL: API_BASE_URL, 
  headers: {
    'Content-Type': 'application/json'
  }
});
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.url && !config.url.startsWith('/api')) {
        config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    console.log('[Axios Interceptor] Requesting:', config.baseURL + config.url);
    return config;
  },
  (error) => Promise.reject(error)
);
export const authService = {
  signup: (userData) => {
    const url = '/auth/signup'; 
    console.log('[API Service] Attempting POST to:', url);
    return api.post(url, userData); 
  },
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile')
};
export default API_URL; 