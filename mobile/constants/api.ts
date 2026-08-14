import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Live Production Cloud Server on Render
const PRODUCTION_CLOUD_URL = 'https://queuepay-server.onrender.com';

export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Connect directly to the Live Cloud Server on Render
  return PRODUCTION_CLOUD_URL;
};

export const API_BASE_URL = getApiBaseUrl();
