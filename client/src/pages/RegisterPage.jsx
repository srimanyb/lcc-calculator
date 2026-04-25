import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';

export default function RegisterPage() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      addToast('Account created! Welcome 🎉', 'success');
      navigate('/recipes');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo" style={{ marginBottom: '2.5rem' }}>
          <Logo />
          <div className="auth-sub" style={{ marginTop: '1rem' }}>Start building your recipe library</div>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              className="form-input"
              placeholder="Jane Smith"
              value={form.name}
              onChange={handle}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handle}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handle}
              required
              minLength={6}
            />
          </div>

          {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}

          <button
            type="submit"
            id="register-submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
