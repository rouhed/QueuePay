import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle, 
  AlertTriangle,
  Mail,
  Lock,
  Phone,
  User,
  ArrowRight,
  Monitor
} from 'lucide-react';
import QueuePayLogo from '../components/QueuePayLogo';
import { triggerNotification } from '../components/DynamicIslandNotification';

import { API_BASE_URL } from '../config/api';

export default function EntityOnboarding({ slug, goHome, setPage, setToken }) {
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sign-Up Form states (Onboarding)
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Login Form states (Branded Login)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const fetchOnboardingDetails = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/entity/onboarding/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Entreprise non valide ou introuvable');
        return res.json();
      })
      .then(data => {
        setEntity(data.entity);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOnboardingDetails();
  }, [slug]);

  // Submit Sign-Up Form (Finish Onboarding)
  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    setError('');

    fetch(`${API_BASE_URL}/entity/onboarding/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        admin_phone: adminPhone
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setSuccess(true);
          triggerNotification('Configuration finalisée !', 'success');
        }
      })
      .catch(() => setError('Erreur de communication'));
  };

  // Submit Login Form (Branded Login Page)
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: loginEmail, password: loginPassword })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          if (data.user.role !== 'COMPANY' && data.user.role !== 'AGENT') {
            setError('Accès réservé uniquement aux comptes Espace Pro');
          } else {
            // Verify that this user belongs to this specific entity!
            if (data.user.entity_id !== entity.id) {
              setError('Identifiants non autorisés pour cette entreprise');
            } else {
              // Use React state flow — sessionStorage is per-tab so no conflict with admin tabs
              setToken(data.token);
              triggerNotification('Connexion entreprise réussie', 'success');
            }
          }
        } else {
          setError(data.error || 'Identifiants invalides');
        }
      })
      .catch(() => setError('Erreur de communication avec le serveur'));
  };

  if (loading) return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--cream-bg)' }}>Chargement des informations...</div>;

  // Render BRANDED LOGIN SCREEN if onboarding is already completed
  if (entity?.onboarding_completed) {
    return (
      <div className="entity-onboarding-bg animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="glass-panel" style={{ padding: '40px', width: '420px', background: 'rgba(255,253,251,0.92)', boxShadow: '0 8px 32px var(--glass-shadow)' }}>
          
          {/* Double Logo Layout: Entity Logo (Left) | QueuePay Logo (Right) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--champagne)', paddingBottom: '16px' }}>
            <div>
              {entity.logo_url ? (
                <img src={entity.logo_url} height="40" alt="Logo" style={{ objectFit: 'contain', maxWidth: '120px', borderRadius: '4px' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--espresso)' }}>
                  <Building2 size={20} color="var(--saffron)" />
                  <span style={{ fontSize: '14px' }}>{entity.name}</span>
                </div>
              )}
            </div>
            <div>
              <QueuePayLogo height={32} showText={false} />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-title)' }}>Connexion {entity.name}</h2>
            <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginTop: '4px' }}>Accéder à la console administrative ou agent de guichet.</p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)', marginBottom: '6px' }}>Email professionnel / ID</label>
              <input 
                type="email" 
                required 
                className="form-input" 
                placeholder="nom@entreprise.com" 
                value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)', marginBottom: '6px' }}>Mot de passe</label>
              <input 
                type="password" 
                required 
                className="form-input" 
                placeholder="••••••••" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              Connexion Espace Pro
            </button>
            <button type="button" className="btn-secondary" onClick={goHome}>
              Retour à l'accueil
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render SIGN-UP ONBOARDING FORM if onboarding has not been completed
  return (
    <div className="entity-onboarding-bg animate-fade-in">
      <div className="glass-panel" style={{ padding: '40px', width: '500px', background: 'rgba(255,253,251,0.92)', boxShadow: '0 8px 32px var(--glass-shadow)' }}>
        
        {/* Double Logo Layout: Entity Logo (Left) | QueuePay Logo (Right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--champagne)', paddingBottom: '16px' }}>
          <div>
            {entity?.logo_url ? (
              <img src={entity.logo_url} height="40" alt="Logo Entreprise" style={{ objectFit: 'contain', maxWidth: '140px', borderRadius: '4px' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--espresso)' }}>
                <Building2 size={22} color="var(--saffron)" />
                <span style={{ fontSize: '15px' }}>{entity?.name}</span>
              </div>
            )}
          </div>
          <div>
            <QueuePayLogo height={32} showText={false} />
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', marginBottom: '16px' }}>
              <CheckCircle size={32} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: '800' }}>Bienvenue chez QueuePay !</h2>
            <p style={{ fontSize: '14px', color: 'var(--espresso-muted)', marginTop: '8px', marginBottom: '24px' }}>
              Vos informations ont été enregistrées. Vous pouvez maintenant vous connecter à votre espace marchand sous cette même adresse.
            </p>
            <button className="btn-primary" onClick={() => { window.location.reload(); }}>
              Se connecter au dashboard
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-title)' }}>Finaliser votre Partenariat</h2>
              <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginTop: '4px' }}>
                Configurez l'accès administrateur de votre entreprise pour la plateforme QueuePay.
              </p>
            </div>

            <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)', marginBottom: '4px' }}>Nom complet de l'administrateur</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="ex: Jean de Dieu" 
                  value={adminName} 
                  onChange={e => setAdminName(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)', marginBottom: '4px' }}>Email professionnel</label>
                <input 
                  type="email" 
                  required 
                  className="form-input" 
                  placeholder="nom@entreprise.com" 
                  value={adminEmail} 
                  onChange={e => setAdminEmail(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)', marginBottom: '4px' }}>Mot de passe du Dashboard</label>
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  placeholder="Min. 8 caractères" 
                  value={adminPassword} 
                  onChange={e => setAdminPassword(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)', marginBottom: '4px' }}>Numéro de téléphone</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="ex: +261 34 00 000 00" 
                  value={adminPhone} 
                  onChange={e => setAdminPhone(e.target.value)} 
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                Créer mon Espace Entreprise
              </button>
              <button type="button" className="btn-secondary" onClick={goHome}>
                Annuler
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
