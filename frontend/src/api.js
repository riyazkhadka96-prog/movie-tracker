const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const isDevelopmentServer = typeof window !== 'undefined' && window.location.port === '3000';
export const API_BASE = process.env.REACT_APP_API_BASE || (
  isDevelopmentServer ? `http://${host}:5000` : typeof window !== 'undefined' ? window.location.origin : ''
);
