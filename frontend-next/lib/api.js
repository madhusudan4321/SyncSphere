import { BASE_URL } from './utils';

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pic_token');
};

const api = {
  async request(method, endpoint, data = null, isForm = false) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';
    const options = { method, headers };
    if (data) options.body = isForm ? data : JSON.stringify(data);
    const res = await fetch(BASE_URL + endpoint, options);
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401 && !/\/(login|register)/.test(endpoint)) {
        localStorage.removeItem('pic_token');
        localStorage.removeItem('pic_user');
        localStorage.removeItem('ss_feed_cache');
        localStorage.removeItem('ss_feed_cache_ts');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      const err = new Error(json.message || 'Request failed');
      Object.assign(err, json);
      err.status = res.status;
      throw err;
    }
    return json;
  },
  get: (ep) => api.request('GET', ep),
  post: (ep, data) => api.request('POST', ep, data),
  put: (ep, data) => api.request('PUT', ep, data),
  del: (ep) => api.request('DELETE', ep),
  upload: (ep, formData) => api.request('POST', ep, formData, true),
};

export default api;
