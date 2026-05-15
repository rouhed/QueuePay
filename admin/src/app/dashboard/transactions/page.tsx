'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { walletApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  paymentMethod: string | null;
  status: string;
  externalReference: string | null;
  ticketId: string | null;
  description: string | null;
  createdAt: string;
  wallet?: {
    id: string;
    userId: string;
    user?: { firstName: string; lastName: string; email: string };
  };
}

export default function TransactionsPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [walletStats, setWalletStats] = useState<any>(null);

  const typeBadge: Record<string, { class: string; label: string; icon: string }> = {
    deposit: { class: 'badge-success', label: 'Dépôt', icon: '📥' },
    ticket_purchase: { class: 'badge-info', label: 'Achat ticket', icon: '🎫' },
    refund: { class: 'badge-warning', label: 'Remboursement', icon: '↩️' },
    withdrawal: { class: 'badge-error', label: 'Retrait', icon: '📤' },
  };

  const statusBadge: Record<string, { class: string; label: string }> = {
    pending: { class: 'badge-warning', label: '⏳ En attente' },
    success: { class: 'badge-success', label: '✅ Succès' },
    failed: { class: 'badge-error', label: '✗ Échoué' },
    refunded: { class: 'badge-info', label: '↩ Remboursé' },
  };

  const paymentLabel: Record<string, string> = {
    mvola: '📱 MVola',
    orange_money: '🟠 Orange Money',
    wallet: '💰 Wallet',
    free: '🆓 Gratuit',
  };

  // ── Charger les transactions (via endpoint admin dédié) ──
  const loadTransactions = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', '25');

      // Fetch wallet stats
      const stats = await walletApi.getStats(token).catch(() => null);
      if (stats) setWalletStats(stats);

      // Fetch transactions via direct API call
      const res = await fetch(`${API_URL}/wallet/admin/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
        setMeta(data.meta || { total: 0, page: 1, totalPages: 1 });
      } else {
        setTransactions([]);
        setMeta({ total: 0, page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [token, typeFilter, statusFilter]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>💰 Transactions</h1>
          <p className="page-subtitle">Suivi financier — dépôts, achats, retraits</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => loadTransactions()}>🔄 Actualiser</button>
      </div>

      {/* Stats financières */}
      {walletStats && (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
          {[
            { label: 'Portefeuilles', value: walletStats.totalWallets, icon: '👛', color: 'rgba(108,92,231,0.15)' },
            { label: 'Solde total retenu', value: `${(walletStats.totalBalanceHeld || 0).toLocaleString()} Ar`, icon: '🏦', color: 'rgba(0,184,148,0.15)' },
            { label: 'Dépôts aujourd\'hui', value: `${(walletStats.depositsToday || 0).toLocaleString()} Ar`, icon: '📥', color: 'rgba(116,185,255,0.15)' },
            { label: 'Achats aujourd\'hui', value: `${(walletStats.purchasesToday || 0).toLocaleString()} Ar`, icon: '🎫', color: 'rgba(253,203,110,0.15)' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem', background: s.color, padding: '8px', borderRadius: 'var(--radius-md)' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{s.value}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-lg)' }}>
        <select className="input" style={{ width: 200 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tous les types</option>
          <option value="deposit">Dépôts</option>
          <option value="ticket_purchase">Achats tickets</option>
          <option value="refund">Remboursements</option>
          <option value="withdrawal">Retraits</option>
        </select>
        <select className="input" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="success">Succès</option>
          <option value="pending">En attente</option>
          <option value="failed">Échoués</option>
          <option value="refunded">Remboursés</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container glass-card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Montant</th>
              <th>Solde après</th>
              <th>Moyen paiement</th>
              <th>Statut</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Aucune transaction trouvée
              </td></tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span className={`badge ${typeBadge[tx.type]?.class || 'badge-neutral'}`}>
                      {typeBadge[tx.type]?.icon} {typeBadge[tx.type]?.label || tx.type}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      color: Number(tx.amount) >= 0 ? 'var(--success)' : 'var(--error)',
                    }}>
                      {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toLocaleString()} Ar
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {Number(tx.balanceAfter).toLocaleString()} Ar
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {tx.paymentMethod ? (paymentLabel[tx.paymentMethod] || tx.paymentMethod) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${statusBadge[tx.status]?.class || 'badge-neutral'}`}>
                      {statusBadge[tx.status]?.label || tx.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description || '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(tx.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
          <button onClick={() => loadTransactions(meta.page - 1)} disabled={meta.page <= 1}>‹</button>
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={meta.page === p ? 'active' : ''} onClick={() => loadTransactions(p)}>{p}</button>
          ))}
          <button onClick={() => loadTransactions(meta.page + 1)} disabled={meta.page >= meta.totalPages}>›</button>
        </div>
      )}
    </div>
  );
}
