// const API_URL = 'http://localhost:3001/api';
const API_URL = 'https://collaborative-text-editor-b1dp.onrender.com/api'

let authToken = localStorage.getItem('authToken');

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => authToken;

const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const authApi = {
  register: async (email, password, name) => {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setAuthToken(data.token);
    return data;
  },

  login: async (email, password) => {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  logout: async () => {
    await fetchWithAuth('/auth/logout', { method: 'POST' });
    setAuthToken(null);
  },

  getCurrentUser: async () => fetchWithAuth('/auth/me'),
};

export const documentApi = {
  getAll: async () => fetchWithAuth('/documents'),

  getById: async (id) => fetchWithAuth(`/documents/${id}`),

  create: async (title) => fetchWithAuth('/documents', {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),

  update: async (id, data) => fetchWithAuth(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: async (id) => fetchWithAuth(`/documents/${id}`, { method: 'DELETE' }),

  share: async (id, email, role) => fetchWithAuth(`/documents/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  }),

  getPermissions: async (id) => fetchWithAuth(`/documents/${id}/permissions`),
};

export const aiApi = {
  checkGrammar: async (text) => fetchWithAuth('/ai/grammar-check', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),

  enhanceText: async (text) => fetchWithAuth('/ai/enhance', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),

  summarize: async (text) => fetchWithAuth('/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),

  complete: async (text, context) => fetchWithAuth('/ai/complete', {
    method: 'POST',
    body: JSON.stringify({ text, context }),
  }),

  getSuggestions: async (text, topic) => fetchWithAuth('/ai/suggestions', {
    method: 'POST',
    body: JSON.stringify({ text, topic }),
  }),
};


