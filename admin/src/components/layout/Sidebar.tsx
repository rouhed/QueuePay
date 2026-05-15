'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const mainNav: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: '📊' },
  { label: 'Entités', href: '/dashboard/entities', icon: '🏢' },
  { label: 'Files d\'attente', href: '/dashboard/queues', icon: '🎫' },
  { label: 'Tickets', href: '/dashboard/tickets', icon: '🎟️' },
  { label: 'Transactions', href: '/dashboard/transactions', icon: '💰' },
];

const managementNav: NavItem[] = [
  { label: 'Utilisateurs', href: '/dashboard/users', icon: '👥' },
  { label: 'Journal d\'audit', href: '/dashboard/audit', icon: '📋' },
  { label: 'Paramètres', href: '/dashboard/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">Q</div>
          <span className="logo-text">Queue<span className="text-gradient">Pay</span></span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Principal</div>
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="nav-section-title">Gestion</div>
        {managementNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          QueuePay v1.0 — Admin
        </div>
      </div>
    </aside>
  );
}
