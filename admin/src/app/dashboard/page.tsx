'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState, useCallback } from 'react';
import { entitiesApi, queuesApi, usersApi, ticketsApi } from '@/lib/api';

interface DashboardStats {
  entities: number;
  queues: number;
  users: number;
  revenueToday: number;
  ticketsToday: number;
  ticketsInQueue: number;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const [entitiesRes, queuesRes, usersRes, ticketStats] = await Promise.all([
        entitiesApi.getAll(token, 'limit=1').catch(() => ({ data: [], meta: { total: 0 } })),
        queuesApi.getAll(token, 'limit=1').catch(() => ({ data: [], meta: { total: 0 } })),
        usersApi.getAll(token, 'limit=1').catch(() => ({ data: [], meta: { total: 0 } })),
        ticketsApi.getStats(token).catch(() => ({
          totalToday: 0,
          inQueue: 0,
          revenueToday: 0,
        })),
      ]);

      setStats({
        entities: entitiesRes.meta.total,
        queues: queuesRes.meta.total,
        users: usersRes.meta.total,
        revenueToday: ticketStats.revenueToday || 0,
        ticketsToday: ticketStats.totalToday || 0,
        ticketsInQueue: ticketStats.inQueue || 0,
      });
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const statCards = [
    {
      icon: '🏢',
      label: 'Entités actives',
      value: stats?.entities ?? '—',
      change: 'Total enregistré',
      positive: true,
      color: 'rgba(108, 92, 231, 0.15)',
    },
    {
      icon: '🎫',
      label: 'Tickets aujourd\'hui',
      value: stats?.ticketsToday ?? '—',
      change: `${stats?.ticketsInQueue ?? 0} en file`,
      positive: true,
      color: 'rgba(0, 184, 148, 0.15)',
    },
    {
      icon: '👥',
      label: 'Utilisateurs',
      value: stats?.users ?? '—',
      change: 'Total inscrits',
      positive: true,
      color: 'rgba(116, 185, 255, 0.15)',
    },
    {
      icon: '💰',
      label: 'Revenus du jour',
      value: stats ? `${stats.revenueToday.toLocaleString()} Ar` : '—',
      change: 'Tickets payés',
      positive: true,
      color: 'rgba(253, 203, 110, 0.15)',
    },
  ];

  const recentActivity = [
    { time: 'Il y a 2 min', action: 'Nouveau ticket acheté', detail: 'Mairie Tana - État civil', type: 'ticket' },
    { time: 'Il y a 5 min', action: 'Paiement MVola reçu', detail: '2,500 Ar — Jean Rakoto', type: 'payment' },
    { time: 'Il y a 12 min', action: 'File saturée', detail: 'Hôpital HJRA — Urgences', type: 'alert' },
    { time: 'Il y a 20 min', action: 'Nouvel agent ajouté', detail: 'Marie R. — Guichet 4', type: 'user' },
    { time: 'Il y a 35 min', action: 'Service terminé', detail: 'Banque BOA — Retraits', type: 'done' },
  ];

  const typeIcons: Record<string, string> = {
    ticket: '🎫',
    payment: '💰',
    alert: '⚠️',
    user: '👤',
    done: '✅',
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Tableau de bord</h1>
          <p className="page-subtitle">
            Bienvenue, {user?.firstName} — Vue d&apos;ensemble de l&apos;activité QueuePay
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadStats}>
            🔄 Actualiser
          </button>
          <button className="btn btn-primary btn-sm">📊 Exporter</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        {statCards.map((stat, i) => (
          <div className={`stat-card ${loading ? 'skeleton' : ''}`} key={i}>
            <div
              className="stat-icon"
              style={{ background: stat.color, fontSize: '1.4rem' }}
            >
              {stat.icon}
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
              {stat.positive ? '↑' : '↓'} {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid-2">
        {/* Recent Activity */}
        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '1.1rem' }}>
            ⚡ Activité récente
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentActivity.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <span style={{ fontSize: '1.2rem', width: 32, textAlign: 'center' }}>
                  {typeIcons[item.type]}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.action}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.detail}</div>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card">
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '1.1rem' }}>
            🚀 Actions rapides
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🏢', label: 'Nouvelle entité', desc: 'Ajouter une organisation', href: '/dashboard/entities' },
              { icon: '🎫', label: 'Nouvelle file', desc: 'Créer une file d\'attente', href: '/dashboard/queues' },
              { icon: '👤', label: 'Nouvel agent', desc: 'Ajouter un agent guichet', href: '/dashboard/users' },
              { icon: '🎟️', label: 'Voir les tickets', desc: 'Gérer les tickets actifs', href: '/dashboard/tickets' },
            ].map((action, i) => (
              <a
                key={i}
                href={action.href}
                className="nav-item"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-base)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{action.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {action.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {action.desc}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
