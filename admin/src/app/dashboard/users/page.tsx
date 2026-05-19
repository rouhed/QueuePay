'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { usersApi } from '@/lib/api';

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const roleBadge: Record<string, { class: string; label: string }> = {
    super_admin: { class: 'badge-primary', label: '👑 Super Admin' },
    admin: { class: 'badge-info', label: '⚙️ Admin' },
    agent: { class: 'badge-warning', label: '🖥️ Agent' },
    client: { class: 'badge-neutral', label: '👤 Client' },
  };

  const loadUsers = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await usersApi.getAll(token, params.toString());
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Désactiver / Activer ──────────────────────
  const toggleActive = async (user: UserItem) => {
    if (!token) return;
    try {
      await usersApi.update(user.id, { isActive: !user.isActive }, token);
      loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  // ── Changer de Rôle ───────────────────────────
  const changeRole = async (user: UserItem, newRole: string) => {
    if (!token) return;
    if (!confirm(`Changer le rôle de ${user.firstName} en ${newRole} ?`)) return;
    try {
      await usersApi.update(user.id, { role: newRole }, token);
      loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  // ── Supprimer ─────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!token || !confirm('Supprimer cet utilisateur ?')) return;
    try {
      await usersApi.delete(id, token);
      loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  // Compter par rôle
  const countByRole = (role: string) => users.filter(u => u.role === role).length;
  const countAdmins = users.filter(u => ['admin', 'super_admin'].includes(u.role)).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>👥 Utilisateurs</h1>
          <p className="page-subtitle">{meta.total} comptes enregistrés</p>
        </div>
      </div>

      {/* Stats mini */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        {[
          { label: 'Total', value: meta.total, icon: '👥', color: 'rgba(108,92,231,0.15)' },
          { label: 'Clients', value: countByRole('client'), icon: '👤', color: 'rgba(150,150,187,0.1)' },
          { label: 'Agents', value: countByRole('agent'), icon: '🖥️', color: 'rgba(253,203,110,0.15)' },
          { label: 'Admins', value: countAdmins, icon: '⚙️', color: 'rgba(116,185,255,0.15)' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.5rem', background: s.color, padding: '8px', borderRadius: 'var(--radius-md)' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-lg)' }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
          <span className="search-icon">🔍</span>
          <input
            className="input"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 44 }}
          />
        </div>
        <select className="input" style={{ width: 180 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Tous les rôles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="client">Client</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container glass-card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Vérifié</th>
              <th>Inscrit le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Aucun utilisateur trouvé
              </td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-full)',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <span style={{ fontWeight: 600 }}>{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.phone}</td>
                  <td>
                    <select
                      className={`badge ${roleBadge[user.role]?.class || 'badge-neutral'}`}
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value)}
                      style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="agent">Agent</option>
                      <option value="client">Client</option>
                    </select>
                  </td>
                  <td>
                    <span
                      className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleActive(user)}
                      title="Cliquer pour changer"
                    >
                      {user.isActive ? '● Actif' : '● Inactif'}
                    </span>
                  </td>
                  <td>
                    {user.isVerified ? (
                      <span style={{ color: 'var(--success)' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>✗</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" title="Désactiver" onClick={() => toggleActive(user)}>
                        {user.isActive ? '🚫' : '✅'}
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Supprimer" onClick={() => handleDelete(user.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => loadUsers(meta.page - 1)} disabled={meta.page <= 1}>‹</button>
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={meta.page === p ? 'active' : ''} onClick={() => loadUsers(p)}>{p}</button>
          ))}
          <button onClick={() => loadUsers(meta.page + 1)} disabled={meta.page >= meta.totalPages}>›</button>
        </div>
      )}
    </div>
  );
}
