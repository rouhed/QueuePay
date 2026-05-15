'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(identifier, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background effects */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.loginBox}>
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>Q</div>
          <h1 style={styles.logoText}>Queue<span style={styles.logoAccent}>Pay</span></h1>
          <p style={styles.logoSubtitle}>Panneau d&apos;administration</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label htmlFor="login-identifier">Email ou téléphone</label>
            <input
              id="login-identifier"
              className="input"
              type="text"
              placeholder="admin@queuepay.mg"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <p style={styles.footer}>
          © 2026 QueuePay — Tous droits réservés
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrb1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)',
    top: '-100px',
    right: '-100px',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,184,148,0.1) 0%, transparent 70%)',
    bottom: '-80px',
    left: '-80px',
    pointerEvents: 'none',
  },
  loginBox: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(19, 19, 43, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(108, 92, 231, 0.2)',
    borderRadius: '24px',
    padding: '48px 40px',
    position: 'relative',
    zIndex: 1,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoIcon: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg, #6C5CE7, #00B894)',
    borderRadius: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '1.5rem',
    color: 'white',
    marginBottom: '16px',
  },
  logoText: {
    fontSize: '1.8rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#F0F0FF',
    margin: 0,
  },
  logoAccent: {
    background: 'linear-gradient(135deg, #A29BFE, #00B894)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoSubtitle: {
    color: '#9696BB',
    fontSize: '0.9rem',
    marginTop: '4px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  errorBox: {
    background: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#FF6B6B',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  submitBtn: {
    width: '100%',
    marginTop: '8px',
  },
  footer: {
    textAlign: 'center',
    color: '#5E5E80',
    fontSize: '0.75rem',
    marginTop: '32px',
  },
};
