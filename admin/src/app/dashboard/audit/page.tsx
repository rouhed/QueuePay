'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { auditApi } from '@/lib/api';

interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

export default function AuditPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const actionColors: Record<string, string> = {
    create: 'badge-success',
    update: 'badge-info',
    delete: 'badge-error',
    login: 'badge-primary',
    logout: 'badge-neutral',
    activate: 'badge-success',
    deactivate: 'badge-warning',
  };

  const actionIcons: Record<string, string> = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    login: '🔑',
    logout: '🚪',
    activate: '✅',
    deactivate: '🚫',
  };

  const resourceIcons: Record<string, string> = {
    user: '👤',
    entity: '🏢',
    queue: '🎫',
    ticket: '🎟️',
    wallet: '💰',
    auth: '🔐',
  };

  const loadLogs = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (resourceFilter) params.set('resource', resourceFilter);
      params.set('page', String(page));
      params.set('limit', '30');

      const res = await auditApi.getAll(token, params.toString());
      setLogs(res.data);
      setMeta(res.meta);
    } catch (err) {
      console.error('Erreur chargement audit:', err);
    } finally {
      setLoading(false);
    }
  }, [token, actionFilter, resourceFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📋 Journal d&apos;audit</h1>
          <p className="page-subtitle">Traçabilité complète — {meta.total} entrées</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => loadLogs()}>🔄 Actualiser</button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-lg)' }}>
        <select className="input" style={{ width: 180 }} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">Toutes les actions</option>
          <option value="create">Création</option>
          <option value="update">Modification</option>
          <option value="delete">Suppression</option>
          <option value="login">Connexion</option>
          <option value="logout">Déconnexion</option>
          <option value="activate">Activation</option>
          <option value="deactivate">Désactivation</option>
        </select>
        <select className="input" style={{ width: 180 }} value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)}>
          <option value="">Toutes les ressources</option>
          <option value="user">Utilisateurs</option>
          <option value="entity">Entités</option>
          <option value="queue">Files</option>
          <option value="ticket">Tickets</option>
          <option value="wallet">Wallet</option>
          <option value="auth">Auth</option>
        </select>
      </div>

      {/* Timeline style list */}
      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Aucune entrée d&apos;audit trouvée
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '16px 20px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  transition: 'background 0.15s',
                }}
                className="nav-item"
              >
                {/* Icon */}
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                  border: '1px solid var(--border-subtle)',
                }}>
                  {actionIcons[log.action] || resourceIcons[log.resource] || '📝'}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${actionColors[log.action] || 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                      {log.action.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {resourceIcons[log.resource] || '📁'} {log.resource}
                    </span>
                    {log.resourceId && (
                      <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', opacity: 0.7 }}>
                        #{log.resourceId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  {log.description && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      {log.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {log.user && (
                      <span>
                        👤 {log.user.firstName} {log.user.lastName}
                        <span style={{ opacity: 0.6 }}> ({log.user.role})</span>
                      </span>
                    )}
                    {log.ipAddress && (
                      <span>🌐 {log.ipAddress}</span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(log.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => loadLogs(meta.page - 1)} disabled={meta.page <= 1}>‹</button>
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={meta.page === p ? 'active' : ''} onClick={() => loadLogs(p)}>{p}</button>
          ))}
          <button onClick={() => loadLogs(meta.page + 1)} disabled={meta.page >= meta.totalPages}>›</button>
        </div>
      )}
    </div>
  );
}
