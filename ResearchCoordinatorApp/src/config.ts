// API configuration
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (false) {
    // Development: Use your local development server
    return Platform.select({
      ios: 'http://localhost:3000/api',
      android: 'http://10.0.2.2:3000/api',
      default: 'http://10.0.0.170:3000/api'
    });
  } else {
    // Production: Use your deployed backend
    return 'https://api.macroscope.info/api';
  }
};

export const API_URL = getApiUrl();

console.log('API_URL configured as:', API_URL);
