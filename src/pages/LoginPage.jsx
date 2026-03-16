import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../components/ui/Toast';
import './LoginPage.css';

function LoginPage() {
  const { signIn, signInWithGoogle, user } = useAuth();

  if (user) return <Navigate to="/" replace />;
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // On success, Supabase redirects — no need to navigate manually
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">💰</div>
          <h1>Masuk</h1>
          <p>Selamat datang kembali</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="nama@email.com"
                className="auth-input"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Kata Sandi</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="auth-input"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="auth-forgot">
            <Link to="/forgot-password" className="auth-link">Lupa kata sandi?</Link>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg auth-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><LogIn size={17} /> Masuk</>}
          </button>
        </form>

        <div className="auth-divider">
          <span>atau</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-full btn-lg auth-google-btn"
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <span className="spinner spinner-dark" />
          ) : (
            <>
              <GoogleIcon />
              Masuk dengan Google
            </>
          )}
        </button>

        <p className="auth-footer">
          Belum punya akun?{' '}
          <Link to="/register" className="auth-link">Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.1 13.1 17.6 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
      <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.7 2.2-6.4 0-11.9-3.6-13.6-8.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

export default LoginPage;
