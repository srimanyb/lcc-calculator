// Thin wrapper around fetch that:
// 1. Reads the JWT from localStorage
// 2. Sets JSON headers
// 3. Throws on non-2xx responses with the server's error message

const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const token = localStorage.getItem('mm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const msg = data?.message || data?.errors?.[0]?.msg || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => request('/api/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => request('/api/auth/me'),

  // Recipes
  getRecipes: (page = 1) => request(`/api/recipes?page=${page}&limit=30`),
  getRecipe:  (id)       => request(`/api/recipes/${id}`),
  search:     (q)        => request(`/api/recipes/search?q=${encodeURIComponent(q)}`),
  createRecipe: (body)   => request('/api/recipes', { method: 'POST', body: JSON.stringify(body) }),
  updateRecipe: (id, body) => request(`/api/recipes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRecipe: (id)     => request(`/api/recipes/${id}`, { method: 'DELETE' }),
  useRecipe:  (id)       => request(`/api/recipes/${id}/use`, { method: 'POST' }),
};
