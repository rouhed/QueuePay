import React, { useEffect } from 'react';

export default function RegressBar({ active, onComplete }) {
  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 3000); // 3 seconds regress countdown
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div className="logout-overlay">
      <div 
        className="glass-panel" 
        style={{ 
          padding: '32px', 
          width: '320px', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '16px',
          background: 'rgba(255, 253, 251, 0.95)',
          boxShadow: '0 24px 60px rgba(41, 37, 36, 0.15)'
        }}
      >
        {/* Animated circular lock or check */}
        <div 
          style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'rgba(249, 115, 22, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--saffron)'
          }}
        >
          {/* Padlock icon representation in SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--espresso)' }}>
            Déconnexion sécurisée
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--espresso-muted)', marginTop: '4px', fontWeight: '500' }}>
            Nettoyage de votre session en cours...
          </p>
        </div>

        {/* Linear progress se vidant (RegressBar) */}
        <div className="regress-container">
          <div className="regress-bar-fill"></div>
        </div>
      </div>
    </div>
  );
}
