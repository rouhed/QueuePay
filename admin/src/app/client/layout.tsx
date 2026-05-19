'use client';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '20px', background: '#1e1e2d', display: 'flex', alignItems: 'center', gap: 15, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #6c5ce7, #00b894)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          Q
        </div>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Queue<span style={{ color: '#a29bfe' }}>Pay</span> Client</h1>
      </header>
      <main style={{ padding: '20px', maxWidth: 800, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
