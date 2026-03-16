import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';
import './LoginPage.css';

function ForgotPasswordPage() {
  const { user } = useAuth();

  if (user) return <Navigate to="/" replace />;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <CheckCircle size={40} color="var(--color-income)" />
            </div>
            <h1>Cek Email Kamu</h1>
            <p>
              Link reset kata sandi telah dikirim ke<br />
              <strong>{email}</strong>
            </p>
          </div>
          <p className="auth-footer" style={{ marginTop: 8 }}>
            Tidak menerima email?{' '}
            <button
              type="button"
              className="auth-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
              onClick={() => setSent(false)}
            >
              Kirim ulang
            </button>
          </p>
          <p className="auth-footer" style={{ marginTop: 16 }}>
            <Link to="/login" className="auth-link">
              <ArrowLeft size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Kembali ke halaman masuk
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔑</div>
          <h1>Lupa Kata Sandi</h1>
          <p>Masukkan email dan kami akan kirimkan link untuk reset kata sandi</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="auth-input"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg auth-submit"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Kirim Link Reset'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login" className="auth-link">
            <ArrowLeft size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
