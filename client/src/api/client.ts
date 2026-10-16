import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { showErrorNotification, showWarningNotification } from '../utils/notifications';

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

// Track rate limit state
let rateLimitResetTime: number | null = null;
let rateLimitNotificationShown = false;

// Handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    // Network error
    if (!error.response) {
      console.error('Network Error:', error.message);
      
      if (error.code === 'ECONNABORTED') {
        showErrorNotification('Request timeout. The server is taking too long to respond.');
      } else if (error.code === 'ERR_NETWORK') {
        showErrorNotification('Cannot connect to server. Please check your internet connection.');
      } else {
        showErrorNotification('Network error. Please try again.');
      }
      
      return Promise.reject(error);
    }

    // HTTP error responses
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = errorData?.error?.message || errorData?.message;
    
    if (status === 401) {
      // Only logout on authentication errors
      showErrorNotification('Session expired. Please login again.');
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    } else if (status === 429) {
      // Rate limit exceeded
      const retryAfter = error.response.headers['retry-after'];
      const resetTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
      
      rateLimitResetTime = Date.now() + resetTime;
      
      if (!rateLimitNotificationShown) {
        rateLimitNotificationShown = true;
        const waitTime = Math.ceil(resetTime / 1000);
        
        showWarningNotification(
          `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`
        );
        
        // Reset notification flag after cooldown
        setTimeout(() => {
          rateLimitNotificationShown = false;
          rateLimitResetTime = null;
        }, resetTime);
      }
      
      console.warn('Rate limit exceeded:', {
        endpoint: error.config?.url,
        resetTime: new Date(rateLimitResetTime).toISOString(),
      });
    } else if (status === 400) {
      // Bad request - show specific error message
      showErrorNotification(errorMessage || 'Invalid request. Please check your input.');
    } else if (status === 403) {
      showErrorNotification(errorMessage || 'Access denied. You do not have permission for this action.');
    } else if (status === 404) {
      showErrorNotification(errorMessage || 'Resource not found.');
    } else if (status === 409) {
      showErrorNotification(errorMessage || 'Conflict. This action cannot be completed.');
    } else if (status === 422) {
      showErrorNotification(errorMessage || 'Validation error. Please check your input.');
    } else if (status >= 500) {
      console.error('Server error:', error.response?.data);
      showErrorNotification(
        errorMessage || 'Server error. Our team has been notified. Please try again later.'
      );
    } else {
      // Generic error
      showErrorNotification(errorMessage || 'An unexpected error occurred. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

// Helper to check if rate limited
export const isRateLimited = (): boolean => {
  if (!rateLimitResetTime) return false;
  return Date.now() < rateLimitResetTime;
};

// Helper to get remaining rate limit time
export const getRateLimitRemainingTime = (): number => {
  if (!rateLimitResetTime) return 0;
  return Math.max(0, Math.ceil((rateLimitResetTime - Date.now()) / 1000));
};
