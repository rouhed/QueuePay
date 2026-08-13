// Central API Base URL configuration for Web Application
// Pointing to Live Cloud Server on Render by default, or VITE_API_BASE_URL if set in environment.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://queuepay-server.onrender.com';
