const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export { API_BASE };

export async function apiFetch(path, options = {}) {
  const token = window.__kc_token;
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}
