const API_BASE = '';

export const api = {
  getToken: () => localStorage.getItem('lgs_token'),
  setToken: (token) => localStorage.setItem('lgs_token', token),
  clearToken: () => localStorage.removeItem('lgs_token'),

  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401 || response.status === 403) {
      this.clearToken();
      // Only reload if we are not already on login or checking initially
      if (window.location.pathname !== '/login') {
        window.location.href = '/';
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Oturum süresi doldu veya yetkisiz erişim.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Bir hata oluştu (Durum: ${response.status})`);
    }

    // Handle CSV or file downloads
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return response.text();
    }

    return response.json();
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
