import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/recipes');
    }
  }, [user, navigate]);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      addToast('Welcome back! 👋', 'success');
      navigate('/recipes');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo" style={{ marginBottom: '2rem' }}>
        {/* Replacing missing image with exact CSS replica of the logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
          <span style={{ 
            fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", 
            color: '#1f7a5c', /* Emerald Green */
            fontSize: '2.8rem', 
            fontWeight: '500',
            letterSpacing: '1px'
          }}>
            Laxmi Chandra
          </span>
          <span style={{ 
            fontFamily: "'Inter', sans-serif", 
            color: '#ffffff', 
            fontSize: '1rem', 
            fontWeight: '400',
            letterSpacing: '4px',
            textTransform: 'uppercase'
          }}>
            Caterers<sup style={{ fontSize: '0.6rem', marginLeft: '2px' }}>®</sup>
          </span>
        </div>
      </div>

      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: '600', color: '#cf9d53', marginBottom: '0.5rem' }}>
            Welcome Back
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Sign in to access your account
          </p>
        </div>

        <form onSubmit={submit}>
          <div className="form-group" style={{ position: 'relative' }}>
            <span className="input-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </span>
            <input
              name="email"
              type="email"
              className="form-input"
              placeholder="Email address"
              value={form.email}
              onChange={handle}
              required
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <span className="input-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </span>
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Password"
              value={form.password}
              onChange={handle}
              required
              style={{ paddingLeft: '2.5rem' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ 
                position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', 
                background: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {showPassword ? (
                 <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                 <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              )}
            </button>
          </div>

          {error && <p className="error-msg" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', padding: '0.85rem', marginTop: '1.5rem',
              background: 'linear-gradient(to right, #cf9d53, #b6853f)',
              color: '#000', fontSize: '1rem', fontWeight: '500', 
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
