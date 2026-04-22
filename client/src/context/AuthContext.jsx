import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session on first load
  useEffect(() => {
    const token = localStorage.getItem('mm_token');
    if (!token) { setLoading(false); return; }

    api.me()
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem('mm_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('mm_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.register({ name, email, password });
    localStorage.setItem('mm_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('mm_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
