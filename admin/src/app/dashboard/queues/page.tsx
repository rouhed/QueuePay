'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { queuesApi, entitiesApi } from '@/lib/api';

interface QueueItem {
  id: string;
  name: string;
  description?: string;
  entityId: string;
  entity?: { id: string; name: string };
  status: string;
  ticketPrice: number;
  isFree: boolean;
  maxCapacity: number;
  currentPosition: number;
  priorityType: string;
  cancelDelayMinutes: number;
  createdAt: string;
}

interface EntityOption {
  id: string;
  name: string;
}

export default function QueuesPage() {
  const { token } = useAuth();
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQueue, setEditingQueue] = useState<QueueItem | null>(null);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusBadge: Record<string, { class: string; label: string }> = {
    active: { class: 'badge-success', label: '● Active' },
    paused: { class: 'badge-warning', label: '⏸ En pause' },
    closed: { class: 'badge-error', label: '● Fermée' },
  };

  // ── Charger les files ─────────────────────────
  const loadQueues = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await queuesApi.getAll(token, params.toString());
      setQueues(res.data);
      setMeta(res.meta);
    } catch (err) {
      console.error('Erreur chargement files:', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  // ── Charger les entités (pour le formulaire) ──
  const loadEntities = useCallback(async () => {
    if (!token) return;
    try {
      const res = await entitiesApi.getAll(token, 'limit=100&isActive=true');
      setEntities(res.data.map((e: any) => ({ id: e.id, name: e.name })));
    } catch (err) {
      console.error('Erreur chargement entités:', err);
    }
  }, [token]);

  useEffect(() => { loadQueues(); }, [loadQueues]);
  useEffect(() => { loadEntities(); }, [loadEntities]);

  // ── Créer / Modifier ──────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const isFree = formData.get('isFree') === 'on';
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      entityId: formData.get('entityId') as string,
      maxCapacity: Number(formData.get('maxCapacity')) || 100,
      ticketPrice: isFree ? 0 : Number(formData.get('ticketPrice')) || 0,
      isFree,
      priorityType: formData.get('priorityType') as string || 'standard',
      cancelDelayMinutes: Number(formData.get('cancelDelayMinutes')) || 30,
    };

    try {
      if (editingQueue) {
        await queuesApi.update(editingQueue.id, data, token);
      } else {
        await queuesApi.create(data, token);
      }
      setShowModal(false);
      setEditingQueue(null);
      loadQueues();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Supprimer ─────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!token || !confirm('Supprimer cette file ?')) return;
    try {
      await queuesApi.delete(id, token);
      loadQueues();
    } catch (err: any) { alert(err.message); }
  };

  // ── Changer le statut ─────────────────────────
  const changeStatus = async (queue: QueueItem, newStatus: string) => {
    if (!token) return;
    try {
      await queuesApi.update(queue.id, { status: newStatus }, token);
      loadQueues();
    } catch (err: any) { alert(err.message); }
  };

  const openCreate = () => { setEditingQueue(null); setFormError(''); setShowModal(true); };
  const openEdit = (q: QueueItem) => { setEditingQueue(q); setFormError(''); setShowModal(true); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🎫 Files d&apos;attente</h1>
          <p className="page-subtitle">{meta.total} files configurées</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouvelle file</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-lg)' }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
          <span className="search-icon">🔍</span>
          <input
            className="input"
            placeholder="Rechercher une file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 44 }}
          />
        </div>
        <select className="input" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="paused">En pause</option>
          <option value="closed">Fermées</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container glass-card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Entité</th>
              <th>Statut</th>
              <th>Prix ticket</th>
              <th>En file</th>
              <th>Capacité</th>
              <th>Priorité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : queues.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Aucune file trouvée
              </td></tr>
            ) : (
              queues.map((queue) => (
                <tr key={queue.id}>
                  <td style={{ fontWeight: 600 }}>{queue.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{queue.entity?.name || '—'}</td>
                  <td>
                    <span className={`badge ${statusBadge[queue.status]?.class || 'badge-neutral'}`}>
                      {statusBadge[queue.status]?.label || queue.status}
                    </span>
                  </td>
                  <td>
                    {queue.isFree ? (
                      <span className="badge badge-neutral">Gratuit</span>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{Number(queue.ticketPrice).toLocaleString()} Ar</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: queue.currentPosition > 30 ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {queue.currentPosition}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{queue.maxCapacity}</td>
                  <td>
                    <span className={`badge ${queue.priorityType === 'priority' ? 'badge-warning' : 'badge-neutral'}`}>
                      {queue.priorityType === 'priority' ? '⚡ Prioritaire' : 'Standard'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => openEdit(queue)}>✏️</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={queue.status === 'active' ? 'Mettre en pause' : 'Activer'}
                        onClick={() => changeStatus(queue, queue.status === 'active' ? 'paused' : 'active')}
                      >
                        {queue.status === 'active' ? '⏸' : '▶'}
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Supprimer" onClick={() => handleDelete(queue.id)}>🗑️</button>
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
          <button onClick={() => loadQueues(meta.page - 1)} disabled={meta.page <= 1}>‹</button>
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={meta.page === p ? 'active' : ''} onClick={() => loadQueues(p)}>{p}</button>
          ))}
          <button onClick={() => loadQueues(meta.page + 1)} disabled={meta.page >= meta.totalPages}>›</button>
        </div>
      )}

      {/* Modal Créer / Modifier */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingQueue ? '✏️ Modifier la file' : '🎫 Nouvelle file'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group">
                  <label>Entité *</label>
                  <select className="input" name="entityId" required defaultValue={editingQueue?.entityId || ''}>
                    <option value="">Choisir une entité</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>{ent.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Nom de la file *</label>
                  <input className="input" name="name" required defaultValue={editingQueue?.name || ''} placeholder="Ex: État civil, Urgences..." autoFocus />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea className="input" name="description" rows={2} defaultValue={editingQueue?.description || ''} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="input-group">
                    <label>Capacité max</label>
                    <input className="input" name="maxCapacity" type="number" min={1} defaultValue={editingQueue?.maxCapacity || 100} />
                  </div>
                  <div className="input-group">
                    <label>Délai annulation (min)</label>
                    <input className="input" name="cancelDelayMinutes" type="number" min={5} defaultValue={editingQueue?.cancelDelayMinutes || 30} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="input-group">
                    <label>Priorité</label>
                    <select className="input" name="priorityType" defaultValue={editingQueue?.priorityType || 'standard'}>
                      <option value="standard">Standard</option>
                      <option value="priority">Prioritaire</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Prix du ticket (Ar)</label>
                    <input className="input" name="ticketPrice" type="number" min={0} defaultValue={editingQueue?.ticketPrice || 0} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" name="isFree" defaultChecked={editingQueue?.isFree ?? true} />
                  Gratuit (pas de paiement requis)
                </label>

                {formError && (
                  <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FF6B6B', fontSize: '0.85rem' }}>
                    ⚠ {formError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Enregistrement...' : (editingQueue ? 'Modifier' : 'Créer')}
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
