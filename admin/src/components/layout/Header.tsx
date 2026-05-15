'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <header className="header">
      <div className="header-left">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Bienvenue, <span style={{ color: 'var(--text-primary)' }}>{user?.firstName}</span> 👋
        </h2>
      </div>

      <div className="header-right">
        {/* Notification bell */}
        <button
          className="btn btn-ghost btn-icon"
          title="Notifications"
          style={{ position: 'relative' }}
        >
          🔔
          <span style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--error)',
          }} />
        </button>

        {/* User menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="header-avatar">{initials}</div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            title="Déconnexion"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  );
}
