'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { ticketsApi } from '@/lib/api';

interface TicketItem {
  id: string;
  ticketNumber: string;
  qrCode: string;
  status: string;
  positionInQueue: number;
  price: number;
  isPaid: boolean;
  paymentMethod: string;
  clientName?: string;
  clientPhone?: string;
  counterNumber?: number;
  notes?: string;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  queue?: { id: string; name: string };
  entity?: { id: string; name: string };
  client?: { id: string; firstName: string; lastName: string; email: string };
  agent?: { id: string; firstName: string; lastName: string };
}

export default function TicketsPage() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  const statusBadge: Record<string, { class: string; label: string }> = {
    pending: { class: 'badge-neutral', label: '⏳ En attente' },
    in_queue: { class: 'badge-info', label: '🎫 En file' },
    called: { class: 'badge-warning', label: '📢 Appelé' },
    serving: { class: 'badge-primary', label: '🔄 En service' },
    completed: { class: 'badge-success', label: '✅ Terminé' },
    cancelled: { class: 'badge-error', label: '✗ Annulé' },
    no_show: { class: 'badge-error', label: '👻 Absent' },
    expired: { class: 'badge-neutral', label: '⏰ Expiré' },
  };

  const paymentLabel: Record<string, string> = {
    mvola: '📱 MVola',
    orange_money: '🟠 Orange Money',
    wallet: '💰 Wallet',
    free: '🆓 Gratuit',
  };

  // ── Charger les tickets ───────────────────────
  const loadTickets = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const [ticketsRes, statsRes] = await Promise.all([
        ticketsApi.getAll(token, params.toString()),
        ticketsApi.getStats(token).catch(() => null),
      ]);

      setTickets(ticketsRes.data);
      setMeta(ticketsRes.meta);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Erreur chargement tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleExport = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      
      const blob = await ticketsApi.exportCsv(token, params.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors de l'export CSV");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🎟️ Tickets</h1>
          <p className="page-subtitle">{meta.total} tickets enregistrés</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>📥 Exporter CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={() => loadTickets()}>🔄 Actualiser</button>
        </div>
      </div>

      {/* Stats mini */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
          {[
            { label: 'Aujourd\'hui', value: stats.totalToday, icon: '🎫', color: 'rgba(108,92,231,0.15)' },
            { label: 'En file', value: stats.inQueue, icon: '⏳', color: 'rgba(253,203,110,0.15)' },
            { label: 'Complétés', value: stats.completedToday, icon: '✅', color: 'rgba(0,184,148,0.15)' },
            { label: 'Revenus', value: `${(stats.revenueToday || 0).toLocaleString()} Ar`, icon: '💰', color: 'rgba(116,185,255,0.15)' },
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
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-lg)' }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
          <span className="search-icon">🔍</span>
          <input
            className="input"
            placeholder="N° ticket, nom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 44 }}
          />
        </div>
        <select className="input" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="in_queue">En file</option>
          <option value="called">Appelés</option>
          <option value="serving">En service</option>
          <option value="completed">Terminés</option>
          <option value="cancelled">Annulés</option>
          <option value="no_show">Absents</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container glass-card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>N° Ticket</th>
              <th>Client</th>
              <th>File / Entité</th>
              <th>Position</th>
              <th>Statut</th>
              <th>Paiement</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Aucun ticket trouvé
              </td></tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--primary)' }}>
                      {ticket.ticketNumber}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {ticket.client
                          ? `${ticket.client.firstName} ${ticket.client.lastName}`
                          : ticket.clientName || 'Anonyme'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ticket.client?.email || ticket.clientPhone || '—'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{ticket.queue?.name || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ticket.entity?.name || '—'}</div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>{ticket.positionInQueue}</td>
                  <td>
                    <span className={`badge ${statusBadge[ticket.status]?.class || 'badge-neutral'}`}>
                      {statusBadge[ticket.status]?.label || ticket.status}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontSize: '0.85rem' }}>
                        {paymentLabel[ticket.paymentMethod] || ticket.paymentMethod}
                      </div>
                      {Number(ticket.price) > 0 && (
                        <div style={{ fontSize: '0.75rem', color: ticket.isPaid ? 'var(--success)' : 'var(--warning)' }}>
                          {Number(ticket.price).toLocaleString()} Ar — {ticket.isPaid ? 'Payé' : 'Non payé'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(ticket.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Détails"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      👁
                    </button>
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
          <button onClick={() => loadTickets(meta.page - 1)} disabled={meta.page <= 1}>‹</button>
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={meta.page === p ? 'active' : ''} onClick={() => loadTickets(p)}>{p}</button>
          ))}
          <button onClick={() => loadTickets(meta.page + 1)} disabled={meta.page >= meta.totalPages}>›</button>
        </div>
      )}

      {/* Modal détails ticket */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎟️ Ticket {selectedTicket.ticketNumber}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <InfoBlock label="Statut">
                  <span className={`badge ${statusBadge[selectedTicket.status]?.class}`}>
                    {statusBadge[selectedTicket.status]?.label}
                  </span>
                </InfoBlock>
                <InfoBlock label="Position">{selectedTicket.positionInQueue}</InfoBlock>
                <InfoBlock label="Client">
                  {selectedTicket.client
                    ? `${selectedTicket.client.firstName} ${selectedTicket.client.lastName}`
                    : selectedTicket.clientName || 'Anonyme'}
                </InfoBlock>
                <InfoBlock label="Téléphone">{selectedTicket.clientPhone || selectedTicket.client?.email || '—'}</InfoBlock>
                <InfoBlock label="File">{selectedTicket.queue?.name || '—'}</InfoBlock>
                <InfoBlock label="Entité">{selectedTicket.entity?.name || '—'}</InfoBlock>
                <InfoBlock label="Paiement">{paymentLabel[selectedTicket.paymentMethod]}</InfoBlock>
                <InfoBlock label="Montant">
                  {Number(selectedTicket.price) > 0 ? `${Number(selectedTicket.price).toLocaleString()} Ar` : 'Gratuit'}
                  {' — '}
                  <span style={{ color: selectedTicket.isPaid ? 'var(--success)' : 'var(--warning)' }}>
                    {selectedTicket.isPaid ? '✓ Payé' : '✗ Non payé'}
                  </span>
                </InfoBlock>
                <InfoBlock label="Créé le">
                  {new Date(selectedTicket.createdAt).toLocaleString('fr-FR')}
                </InfoBlock>
                {selectedTicket.calledAt && (
                  <InfoBlock label="Appelé à">
                    {new Date(selectedTicket.calledAt).toLocaleString('fr-FR')}
                  </InfoBlock>
                )}
                {selectedTicket.completedAt && (
                  <InfoBlock label="Terminé à">
                    {new Date(selectedTicket.completedAt).toLocaleString('fr-FR')}
                  </InfoBlock>
                )}
                {selectedTicket.counterNumber && (
                  <InfoBlock label="Guichet">N°{selectedTicket.counterNumber}</InfoBlock>
                )}
              </div>
              {selectedTicket.agent && (
                <InfoBlock label="Agent">
                  {selectedTicket.agent.firstName} {selectedTicket.agent.lastName}
                </InfoBlock>
              )}
              {selectedTicket.notes && (
                <InfoBlock label="Notes">{selectedTicket.notes}</InfoBlock>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                QR: {selectedTicket.qrCode}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composant utilitaire ────────────────────────
function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{children}</div>
    </div>
  );
}
