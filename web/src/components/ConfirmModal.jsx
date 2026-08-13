import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Premium confirmation modal to replace window.confirm()
 * Usage: 
 *   <ConfirmModal 
 *     open={showConfirm} 
 *     title="Supprimer le service ?" 
 *     message="Cette action est irréversible. Les tickets associés seront supprimés." 
 *     confirmLabel="Oui, supprimer"
 *     onConfirm={() => { doDelete(); setShowConfirm(false); }}
 *     onCancel={() => setShowConfirm(false)}
 *     danger={true}
 *   />
 */
export default function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel, danger = true }) {
  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div 
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(41,37,36,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onCancel}
    >
      <div 
        style={{
          background: '#FFFDFB',
          borderRadius: '20px',
          padding: '36px 32px 28px',
          width: '400px',
          maxWidth: '90vw',
          boxShadow: '0 24px 64px rgba(41,37,36,0.18)',
          border: '1px solid var(--champagne)',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--espresso-muted)',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertTriangle size={26} color={danger ? 'var(--danger)' : 'var(--saffron)'} />
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '18px',
          fontWeight: '900',
          color: 'var(--espresso)',
          margin: '0 0 8px',
          fontFamily: 'var(--font-title)',
          letterSpacing: '-0.3px'
        }}>
          {title}
        </h3>

        {/* Message */}
        <p style={{
          fontSize: '13px',
          color: 'var(--espresso-muted)',
          lineHeight: '1.5',
          margin: '0 0 28px',
          padding: '0 8px'
        }}>
          {message}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--champagne-dark)',
              background: '#fff',
              color: 'var(--espresso)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: danger ? 'var(--danger)' : 'var(--saffron)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: danger ? '0 4px 12px rgba(239,68,68,0.2)' : '0 4px 12px rgba(249,115,22,0.2)'
            }}
          >
            {confirmLabel || 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
