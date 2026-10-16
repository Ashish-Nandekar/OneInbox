import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error
    if (!error.response) {
      console.error('Network Error:', error.message);
      
      // Don't logout on network errors
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout - server may be slow');
      } else if (error.code === 'ERR_NETWORK') {
        console.error('Cannot connect to server - is it running?');
      }
      
      return Promise.reject(error);
    }

    // HTTP error responses
    const status = error.response?.status;
    
    if (status === 401) {
      // Only logout on authentication errors, not on server errors
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    } else if (status === 429) {
      console.warn('Rate limit exceeded - please wait before retrying');
    } else if (status >= 500) {
      console.error('Server error:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);
