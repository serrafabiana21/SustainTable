const API_BASE = 'http://localhost:4000';

export const getToken = () => localStorage.getItem('demo_token');
export const getUser = () => {
  const raw = localStorage.getItem('demo_user');
  return raw ? JSON.parse(raw) : null;
};

export const setSession = (token, user) => {
  localStorage.setItem('demo_token', token);
  localStorage.setItem('demo_user', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('demo_token');
  localStorage.removeItem('demo_user');
};

export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return res.json();
};
