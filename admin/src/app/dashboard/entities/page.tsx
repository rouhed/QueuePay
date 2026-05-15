'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { entitiesApi } from '@/lib/api';

interface Entity {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export default function EntitiesPage() {
  const { token } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Chargement ────────────────────────────────
  const loadEntities = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('isActive', statusFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await entitiesApi.getAll(token, params.toString());
      setEntities(res.data);
      setMeta(res.meta);
    } catch (err) {
      console.error('Erreur chargement entités:', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // ── Créer / Modifier ──────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      address: formData.get('address') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      email: formData.get('email') as string || undefined,
    };

    try {
      if (editingEntity) {
        await entitiesApi.update(editingEntity.id, data, token);
      } else {
        await entitiesApi.create(data, token);
      }
      setShowModal(false);
      setEditingEntity(null);
      loadEntities();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Supprimer ─────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!token || !confirm('Supprimer cette entité ?')) return;
    try {
      await entitiesApi.delete(id, token);
      loadEntities();
    } catch (err: any) {
      alert(err.message || 'Erreur suppression');
    }
  };

  // ── Activer / Désactiver ──────────────────────
  const toggleActive = async (entity: Entity) => {
    if (!token) return;
    try {
      await entitiesApi.update(entity.id, { isActive: !entity.isActive }, token);
      loadEntities();
    } catch (err: any) {
      alert(err.message || 'Erreur mise à jour');
    }
  };

  const openCreate = () => {
    setEditingEntity(null);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormError('');
    setShowModal(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🏢 Entités</h1>
          <p className="page-subtitle">{meta.total} organisations enregistrées</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouvelle entité</button>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-lg)' }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
          <span className="search-icon">🔍</span>
          <input
            className="input"
            placeholder="Rechercher une entité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 44 }}
          />
        </div>
        <select
          className="input"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container glass-card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Adresse</th>
              <th>Téléphone</th>
              <th>Statut</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : entities.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Aucune entité trouvée
              </td></tr>
            ) : (
              entities.map((entity) => (
                <tr key={entity.id}>
                  <td style={{ fontWeight: 600 }}>{entity.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{entity.address || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{entity.phone || '—'}</td>
                  <td>
                    <span
                      className={`badge ${entity.isActive ? 'badge-success' : 'badge-error'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleActive(entity)}
                      title="Cliquer pour changer"
                    >
                      {entity.isActive ? '● Actif' : '● Inactif'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(entity.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => openEdit(entity)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" title="Supprimer" onClick={() => handleDelete(entity.id)}>🗑️</button>
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
          <button onClick={() => loadEntities(meta.page - 1)} disabled={meta.page <= 1}>‹</button>
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={meta.page === p ? 'active' : ''} onClick={() => loadEntities(p)}>
              {p}
            </button>
          ))}
          <button onClick={() => loadEntities(meta.page + 1)} disabled={meta.page >= meta.totalPages}>›</button>
        </div>
      )}

      {/* Modal Créer / Modifier */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEntity ? '✏️ Modifier l\'entité' : '🏢 Nouvelle entité'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group">
                  <label>Nom *</label>
                  <input className="input" name="name" required defaultValue={editingEntity?.name || ''} autoFocus />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea className="input" name="description" rows={3} defaultValue={editingEntity?.description || ''} style={{ resize: 'vertical' }} />
                </div>
                <div className="input-group">
                  <label>Adresse</label>
                  <input className="input" name="address" defaultValue={editingEntity?.address || ''} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="input-group">
                    <label>Téléphone</label>
                    <input className="input" name="phone" defaultValue={editingEntity?.phone || ''} />
                  </div>
                  <div className="input-group">
                    <label>Email</label>
                    <input className="input" name="email" type="email" defaultValue={editingEntity?.email || ''} />
                  </div>
                </div>

                {formError && (
                  <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FF6B6B', fontSize: '0.85rem' }}>
                    ⚠ {formError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Enregistrement...' : (editingEntity ? 'Modifier' : 'Créer')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
