import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const key = localStorage.getItem('om_api_key');
  if (key) {
    config.headers['X-API-Key'] = key;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      config &&
      !config.__retryCount &&
      ['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase() || '')
    ) {
      config.__retryCount = 0;
      while (config.__retryCount < 3) {
        config.__retryCount++;
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        try {
          return await api(config);
        } catch {
          continue;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
