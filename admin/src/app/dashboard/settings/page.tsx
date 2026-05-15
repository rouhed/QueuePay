'use client';

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>⚙️ Paramètres</h1>
          <p className="page-subtitle">Configuration de la plateforme QueuePay</p>
        </div>
      </div>

      <div className="grid-2">
        {/* General */}
        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>🌐 Paramètres généraux</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label>Nom de la plateforme</label>
              <input className="input" defaultValue="QueuePay" />
            </div>
            <div className="input-group">
              <label>Devise</label>
              <select className="input">
                <option>Ariary (Ar)</option>
              </select>
            </div>
            <div className="input-group">
              <label>Fuseau horaire</label>
              <select className="input">
                <option>Indian/Antananarivo (UTC+3)</option>
              </select>
            </div>
            <div className="input-group">
              <label>Langue par défaut</label>
              <select className="input">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="mg">Malagasy</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              Sauvegarder
            </button>
          </div>
        </div>

        {/* Payment APIs */}
        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>💰 APIs de paiement</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: '14px',
              background: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>MVola (Telma)</span>
                <span className="badge badge-success">● Connecté</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Clé API configurée — Mode sandbox
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Orange Money</span>
                <span className="badge badge-warning">⏳ En attente</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Clé API non configurée
              </div>
            </div>

            <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
              Configurer les APIs
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>🔔 Notifications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'SMS (Africa\'s Talking)', status: true },
              { label: 'Push (Firebase FCM)', status: true },
              { label: 'Email (SMTP)', status: false },
            ].map((n, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: '0.875rem' }}>{n.label}</span>
                <span className={`badge ${n.status ? 'badge-success' : 'badge-error'}`}>
                  {n.status ? '● Actif' : '● Inactif'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>🔒 Sécurité</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label>Expiration du token JWT</label>
              <input className="input" defaultValue="15 minutes" />
            </div>
            <div className="input-group">
              <label>Durée du refresh token</label>
              <input className="input" defaultValue="30 jours" />
            </div>
            <div className="input-group">
              <label>Tentatives de connexion max</label>
              <input className="input" type="number" defaultValue={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
