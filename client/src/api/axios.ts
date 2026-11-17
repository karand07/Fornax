import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fornax_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Optional: auto-clear token if invalid
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('fornax_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
