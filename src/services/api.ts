const API_URL = 'http://localhost:3001/api';

let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => authToken;

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
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
  register: async (email: string, password: string, name: string) => {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setAuthToken(data.token);
    return data;
  },

  login: async (email: string, password: string) => {
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

  getCurrentUser: async () => {
    return fetchWithAuth('/auth/me');
  },
};

export const documentApi = {
  getAll: async () => {
    return fetchWithAuth('/documents');
  },

  getById: async (id: string) => {
    return fetchWithAuth(`/documents/${id}`);
  },

  create: async (title?: string) => {
    return fetchWithAuth('/documents', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  update: async (id: string, data: { title?: string; content?: any }) => {
    return fetchWithAuth(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return fetchWithAuth(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  share: async (id: string, email: string, role: 'viewer' | 'editor') => {
    return fetchWithAuth(`/documents/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  getPermissions: async (id: string) => {
    return fetchWithAuth(`/documents/${id}/permissions`);
  },
};

export const aiApi = {
  checkGrammar: async (text: string) => {
    return fetchWithAuth('/ai/grammar-check', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  enhanceText: async (text: string) => {
    return fetchWithAuth('/ai/enhance', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  summarize: async (text: string) => {
    return fetchWithAuth('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  complete: async (text: string, context?: string) => {
    return fetchWithAuth('/ai/complete', {
      method: 'POST',
      body: JSON.stringify({ text, context }),
    });
  },

  getSuggestions: async (text: string, topic?: string) => {
    return fetchWithAuth('/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify({ text, topic }),
    });
  },
};
