import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 15000, // 15 s — prevents requests hanging forever
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Queue of requests waiting for token refresh
let isRefreshing = false;
let queue = [];

const processQueue = (token, error) => {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  queue = [];
};

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Use an explicit timeout so a slow/unresponsive refresh endpoint
        // can never leave isRefreshing=true permanently, which would freeze
        // every subsequent API call in the queue indefinitely.
        const { data } = await axios.post('/api/v1/auth/refresh', {}, {
          withCredentials: true,
          timeout: 12000,
        });
        const token = data.data.accessToken;
        localStorage.setItem('accessToken', token);
        processQueue(token, null);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (err) {
        processQueue(null, err);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
